/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  AlertLicense,
  AlertLicenseState,
} from '../../common/types/alerts';
import { AlertExecutorOptions, AlertInstance } from '../../../alerts/server';
import {
  ALERT_LICENSE_EXPIRATION,
  LEGACY_ALERT_DETAILS,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../common/constants';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';
import { Globals } from '../static_globals';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { fetchLicenses } from '../lib/alerts/fetch_licenses';

const EXPIRES_DAYS = [60, 30, 14, 7];

export class LicenseExpirationAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_LICENSE_EXPIRATION,
      name: LEGACY_ALERT_DETAILS[ALERT_LICENSE_EXPIRATION].label,
      interval: '1d',
      actionVariables: [
        {
          name: 'expiredDate',
          description: i18n.translate(
            'xpack.monitoring.alerts.licenseExpiration.actionVariables.expiredDate',
            {
              defaultMessage: 'The date when the license expires.',
            }
          ),
        },
        {
          name: 'clusterName',
          description: i18n.translate(
            'xpack.monitoring.alerts.licenseExpiration.actionVariables.clusterName',
            {
              defaultMessage: 'The cluster to which the license belong.',
            }
          ),
        },
        AlertingDefaults.ALERT_TYPE.context.internalShortMessage,
        AlertingDefaults.ALERT_TYPE.context.internalFullMessage,
        AlertingDefaults.ALERT_TYPE.context.state,
        AlertingDefaults.ALERT_TYPE.context.action,
        AlertingDefaults.ALERT_TYPE.context.actionPlain,
      ],
    });
  }

  protected async execute(options: AlertExecutorOptions): Promise<any> {
    if (!Globals.app.config.ui.show_license_expiration) {
      return;
    }
    return await super.execute(options);
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const licenses = await fetchLicenses(
      callCluster,
      clusters,
      esIndexPattern,
      Globals.app.config.ui.max_bucket_size
    );

    return licenses.map((license) => {
      const { clusterUuid, type, expiryDateMS, status, ccs } = license;
      const $expiry = moment.utc(expiryDateMS);
      let isExpired = false;
      let severity = AlertSeverity.Success;

      if (status !== 'active') {
        isExpired = true;
        severity = AlertSeverity.Danger;
      } else if (expiryDateMS) {
        for (let i = EXPIRES_DAYS.length - 1; i >= 0; i--) {
          if (type === 'trial' && i < 2) {
            break;
          }

          const $fromNow = moment.utc().add(EXPIRES_DAYS[i], 'days');
          if ($fromNow.isAfter($expiry)) {
            isExpired = true;
            severity = i > 1 ? AlertSeverity.Warning : AlertSeverity.Danger;
            break;
          }
        }
      }

      return {
        shouldFire: isExpired,
        severity,
        meta: license,
        clusterUuid,
        ccs,
      };
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const license = item.meta as AlertLicense;
    return {
      text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.firingMessage', {
        defaultMessage: `The license for this cluster expires in #relative at #absolute. #start_linkPlease update your license.#end_link`,
      }),
      tokens: [
        {
          startToken: '#relative',
          type: AlertMessageTokenType.Time,
          isRelative: true,
          isAbsolute: false,
          timestamp: license.expiryDateMS,
        } as AlertMessageTimeToken,
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: license.expiryDateMS,
        } as AlertMessageTimeToken,
        {
          startToken: '#start_link',
          endToken: '#end_link',
          type: AlertMessageTokenType.Link,
          url: 'license',
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected async executeActions(
    instance: AlertInstance,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    // This alert does not feature grouping
    if (alertStates.length !== 1) {
      return;
    }

    const state: AlertLicenseState = alertStates[0] as AlertLicenseState;
    const $expiry = moment.utc(state.expiryDateMS);
    const $duration = moment.duration(+new Date() - $expiry.valueOf());
    const actionText = i18n.translate('xpack.monitoring.alerts.licenseExpiration.action', {
      defaultMessage: 'Please update your license.',
    });
    const action = `[${actionText}](elasticsearch/nodes)`;
    const expiredDate = $duration.humanize();
    instance.scheduleActions('default', {
      internalShortMessage: i18n.translate(
        'xpack.monitoring.alerts.licenseExpiration.firing.internalShortMessage',
        {
          defaultMessage: `License expiration alert is firing for {clusterName}. Your license expires in {expiredDate}. {actionText}`,
          values: {
            clusterName: cluster.clusterName,
            expiredDate,
            actionText,
          },
        }
      ),
      internalFullMessage: i18n.translate(
        'xpack.monitoring.alerts.licenseExpiration.firing.internalFullMessage',
        {
          defaultMessage: `License expiration alert is firing for {clusterName}. Your license expires in {expiredDate}. {action}`,
          values: {
            clusterName: cluster.clusterName,
            expiredDate,
            action,
          },
        }
      ),
      state: AlertingDefaults.ALERT_STATE.firing,
      expiredDate,
      clusterName: cluster.clusterName,
      action,
      actionPlain: actionText,
    });
  }
}
