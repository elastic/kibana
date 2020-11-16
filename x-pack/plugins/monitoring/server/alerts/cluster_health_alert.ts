/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageLinkToken,
  AlertInstanceState,
  LegacyAlert,
  CommonAlertParams,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import { INDEX_ALERTS, ALERT_CLUSTER_HEALTH, LEGACY_ALERT_DETAILS } from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertClusterHealthType } from '../../common/enums';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { mapLegacySeverity } from '../lib/alerts/map_legacy_severity';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';
import { Globals } from '../static_globals';

const RED_STATUS_MESSAGE = i18n.translate('xpack.monitoring.alerts.clusterHealth.redMessage', {
  defaultMessage: 'Allocate missing primary and replica shards',
});

const YELLOW_STATUS_MESSAGE = i18n.translate(
  'xpack.monitoring.alerts.clusterHealth.yellowMessage',
  {
    defaultMessage: 'Allocate missing replica shards',
  }
);

const WATCH_NAME = 'elasticsearch_cluster_status';

export class ClusterHealthAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_CLUSTER_HEALTH,
      name: LEGACY_ALERT_DETAILS[ALERT_CLUSTER_HEALTH].label,
      isLegacy: true,
      actionVariables: [
        {
          name: 'clusterHealth',
          description: i18n.translate(
            'xpack.monitoring.alerts.clusterHealth.actionVariables.clusterHealth',
            {
              defaultMessage: 'The health of the cluster.',
            }
          ),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
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
      Globals.app.config.ui.max_bucket_size
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

  private getHealth(legacyAlert: LegacyAlert) {
    const prefixStr = 'Elasticsearch cluster status is ';
    return legacyAlert.prefix.slice(
      legacyAlert.prefix.indexOf(prefixStr) + prefixStr.length,
      legacyAlert.prefix.length - 1
    ) as AlertClusterHealthType;
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    const health = this.getHealth(legacyAlert);
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.clusterHealth.ui.resolvedMessage', {
          defaultMessage: `Elasticsearch cluster health is green.`,
        }),
      };
    }

    return {
      text: i18n.translate('xpack.monitoring.alerts.clusterHealth.ui.firingMessage', {
        defaultMessage: `Elasticsearch cluster health is {health}.`,
        values: {
          health,
        },
      }),
      nextSteps: [
        {
          text: i18n.translate('xpack.monitoring.alerts.clusterHealth.ui.nextSteps.message1', {
            defaultMessage: `{message}. #start_linkView now#end_link`,
            values: {
              message:
                health === AlertClusterHealthType.Red ? RED_STATUS_MESSAGE : YELLOW_STATUS_MESSAGE,
            },
          }),
          tokens: [
            {
              startToken: '#start_link',
              endToken: '#end_link',
              type: AlertMessageTokenType.Link,
              url: 'elasticsearch/indices',
            } as AlertMessageLinkToken,
          ],
        },
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
    const health = this.getHealth(legacyAlert);
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.clusterHealth.resolved.internalShortMessage',
          {
            defaultMessage: `Cluster health alert is resolved for {clusterName}.`,
            values: {
              clusterName: cluster.clusterName,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.clusterHealth.resolved.internalFullMessage',
          {
            defaultMessage: `Cluster health alert is resolved for {clusterName}.`,
            values: {
              clusterName: cluster.clusterName,
            },
          }
        ),
        state: AlertingDefaults.ALERT_STATE.resolved,
        clusterHealth: health,
        clusterName: cluster.clusterName,
      });
    } else {
      const actionText =
        health === AlertClusterHealthType.Red
          ? i18n.translate('xpack.monitoring.alerts.clusterHealth.action.danger', {
              defaultMessage: `Allocate missing primary and replica shards.`,
            })
          : i18n.translate('xpack.monitoring.alerts.clusterHealth.action.warning', {
              defaultMessage: `Allocate missing replica shards.`,
            });

      const action = `[${actionText}](elasticsearch/indices)`;
      instance.scheduleActions('default', {
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.clusterHealth.firing.internalShortMessage',
          {
            defaultMessage: `Cluster health alert is firing for {clusterName}. Current health is {health}. {actionText}`,
            values: {
              clusterName: cluster.clusterName,
              health,
              actionText,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.clusterHealth.firing.internalFullMessage',
          {
            defaultMessage: `Cluster health alert is firing for {clusterName}. Current health is {health}. {action}`,
            values: {
              clusterName: cluster.clusterName,
              health,
              action,
            },
          }
        ),
        state: AlertingDefaults.ALERT_STATE.firing,
        clusterHealth: health,
        clusterName: cluster.clusterName,
        action,
        actionPlain: actionText,
      });
    }
  }
}
