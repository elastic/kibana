/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { IUiSettingsClient } from 'kibana/server';
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
  LegacyAlert,
  CommonAlertParams,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  ALERT_LICENSE_EXPIRATION,
  FORMAT_DURATION_TEMPLATE_SHORT,
  LEGACY_ALERT_DETAILS,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType } from '../../common/enums';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { mapLegacySeverity } from '../lib/alerts/map_legacy_severity';
import { AlertingDefaults } from './alert_helpers';

const WATCH_NAME = 'xpack_license_expiration';

export class LicenseExpirationAlert extends BaseAlert {
  public type = ALERT_LICENSE_EXPIRATION;
  public label = LEGACY_ALERT_DETAILS[ALERT_LICENSE_EXPIRATION].label;
  public description = LEGACY_ALERT_DETAILS[ALERT_LICENSE_EXPIRATION].description;
  public isLegacy = true;
  protected actionVariables = [
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
  ];

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let alertIndexPattern = INDEX_ALERTS;
    if (availableCcs) {
      alertIndexPattern = getCcsIndexPattern(alertIndexPattern, availableCcs);
    }
    const legacyAlerts = await fetchLegacyAlerts(
      callCluster,
      clusters,
      alertIndexPattern,
      WATCH_NAME,
      this.config.ui.max_bucket_size
    );
    return legacyAlerts.reduce((accum: AlertData[], legacyAlert) => {
      accum.push({
        instanceKey: `${legacyAlert.metadata.cluster_uuid}`,
        clusterUuid: legacyAlert.metadata.cluster_uuid,
        shouldFire: !legacyAlert.resolved_timestamp,
        severity: mapLegacySeverity(legacyAlert.metadata.severity),
        meta: legacyAlert,
      });
      return accum;
    }, []);
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.resolvedMessage', {
          defaultMessage: `The license for this cluster is active.`,
        }),
      };
    }
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
          timestamp: legacyAlert.metadata.time,
        } as AlertMessageTimeToken,
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: legacyAlert.metadata.time,
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
    instanceState: AlertInstanceState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    if (instanceState.alertStates.length === 0) {
      return;
    }
    const alertState = instanceState.alertStates[0];
    const legacyAlert = item.meta as LegacyAlert;
    const $expiry = moment(legacyAlert.metadata.time);
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.licenseExpiration.resolved.internalShortMessage',
          {
            defaultMessage: `License expiration alert is resolved for {clusterName}.`,
            values: {
              clusterName: cluster.clusterName,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.licenseExpiration.resolved.internalFullMessage',
          {
            defaultMessage: `License expiration alert is resolved for {clusterName}.`,
            values: {
              clusterName: cluster.clusterName,
            },
          }
        ),
        state: AlertingDefaults.ALERT_STATE.resolved,
        expiredDate: $expiry.format(FORMAT_DURATION_TEMPLATE_SHORT).trim(),
        clusterName: cluster.clusterName,
      });
    } else {
      const actionText = i18n.translate('xpack.monitoring.alerts.licenseExpiration.action', {
        defaultMessage: 'Please update your license.',
      });
      const action = `[${actionText}](elasticsearch/nodes)`;
      const expiredDate = $expiry.format(FORMAT_DURATION_TEMPLATE_SHORT).trim();
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
}
