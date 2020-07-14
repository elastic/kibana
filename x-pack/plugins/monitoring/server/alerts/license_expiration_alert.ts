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
} from './types';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  ALERT_LICENSE_EXPIRATION,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
  FORMAT_DURATION_TEMPLATE_SHORT,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType } from '../../common/enums';
import { CommonAlertParams } from '../../common/types';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { mapLegacySeverity } from '../lib/alerts/map_legacy_severity';

const RESOLVED = i18n.translate('xpack.monitoring.alerts.licenseExpiration.resolved', {
  defaultMessage: 'resolved',
});
const FIRING = i18n.translate('xpack.monitoring.alerts.licenseExpiration.firing', {
  defaultMessage: 'firing',
});

const WATCH_NAME = 'xpack_license_expiration';

export class LicenseExpirationAlert extends BaseAlert {
  public type = ALERT_LICENSE_EXPIRATION;
  public label = 'License expiration';
  public isLegacy = true;
  protected actionVariables = [
    { name: 'state', description: 'The current state of the alert.' },
    { name: 'expiredDate', description: 'The date when the license expires.' },
    { name: 'action', description: 'The recommended action to take based on this alert firing.' },
    { name: 'clusterName', description: 'The name of the cluster to which the nodes belong.' },
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
        ccs: null,
      });
      return accum;
    }, []);
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.resolvedMessage', {
          defaultMessage: `This cluster's license is active.`,
        }),
      };
    }
    return {
      text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.firingMessage', {
        defaultMessage: `This cluster's license is going to expire in #relative at #absolute. #start_linkPlease update your license.#end_link`,
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
        state: RESOLVED,
        expiredDate: $expiry.format(FORMAT_DURATION_TEMPLATE_SHORT).trim(),
        clusterName: cluster.clusterName,
      });
    } else {
      instance.scheduleActions('default', {
        state: FIRING,
        expiredDate: $expiry.format(FORMAT_DURATION_TEMPLATE_SHORT).trim(),
        clusterName: cluster.clusterName,
        action: i18n.translate('xpack.monitoring.alerts.licenseExpiration.action', {
          defaultMessage: 'Please update your license',
        }),
      });
    }
  }

  public getDefaultActionParams(actionTypeId: string) {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {
          subject: i18n.translate('xpack.monitoring.alerts.licenseExpiration.emailSubject', {
            defaultMessage: `License expiration alert is {state} for {clusterName}`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
          message: i18n.translate('xpack.monitoring.alerts.licenseExpiration.emailMessage', {
            defaultMessage: `Your license will expire in {expiredDate} for {clusterName}. {action}`,
            values: {
              expiredDate: '{{context.expiredDate}}',
              action: '{{context.action}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
        };
      case ALERT_ACTION_TYPE_LOG:
        return {
          message: i18n.translate('xpack.monitoring.alerts.licenseExpiration.serverLog', {
            defaultMessage: `License expiration alert is {state} for {clusterName}. Your license will expire in {expiredDate}. {action}`,
            values: {
              state: '{{context.state}}',
              expiredDate: '{{context.expiredDate}}',
              action: '{{context.action}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
        };
    }
    return null;
  }
}
