/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient } from 'kibana/server';
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
} from './types';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  ALERT_CLUSTER_HEALTH,
  ALERT_ACTION_TYPE_LOG,
  ALERT_ACTION_TYPE_EMAIL,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertClusterHealthType } from '../../common/enums';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { mapLegacySeverity } from '../lib/alerts/map_legacy_severity';
import { CommonAlertParams } from '../../common/types';

const RED_STATUS_MESSAGE = i18n.translate('xpack.monitoring.alerts.clusterStatus.redMessage', {
  defaultMessage: 'Allocate missing primary and replica shards',
});

const YELLOW_STATUS_MESSAGE = i18n.translate(
  'xpack.monitoring.alerts.clusterStatus.yellowMessage',
  {
    defaultMessage: 'Allocate missing replica shards',
  }
);

const WATCH_NAME = 'elasticsearch_cluster_status';

export class ClusterHealthAlert extends BaseAlert {
  public type = ALERT_CLUSTER_HEALTH;
  public label = 'Cluster health';
  public isLegacy = true;

  protected actionVariables = [
    { name: 'state', description: 'The current state of the alert.' },
    { name: 'clusterHealth', description: 'The health of the cluster.' },
    { name: 'clusterName', description: 'The name of the cluster to which the nodes belong.' },
    { name: 'action', description: 'The recommended action to take based on this alert firing.' },
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
        shouldFire: true,
        severity: mapLegacySeverity(legacyAlert.metadata.severity),
        meta: legacyAlert,
        ccs: null,
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
        text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.resolvedMessage', {
          defaultMessage: `Elasticsearch cluster health is green.`,
        }),
      };
    }

    return {
      text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.firingMessage', {
        defaultMessage: `Elasticsearch cluster health is {health}.`,
        values: {
          health,
        },
      }),
      nextSteps: [
        {
          text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.nextSteps.message1', {
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
        state: 'resolved',
        clusterHealth: health,
        clusterName: cluster.clusterName,
      });
    } else {
      instance.scheduleActions('default', {
        state: 'firing',
        clusterHealth: health,
        clusterName: cluster.clusterName,
        action: 'Allocate missing primary and replica shards.',
      });
    }
  }

  public getDefaultActionParams(actionTypeId: string) {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {
          subject: i18n.translate('xpack.monitoring.alerts.clusterStatus.emailSubject', {
            defaultMessage: `Cluster health alert is {state} for {clusterName}. Current health is {clusterHealth}.`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
              clusterHealth: '{{context.clusterHealth}}',
            },
          }),
          message: i18n.translate('xpack.monitoring.alerts.clusterStatus.emailMessage', {
            defaultMessage: `{action}`,
            values: {
              action: '{{context.action}}',
            },
          }),
        };
      case ALERT_ACTION_TYPE_LOG:
        return {
          message: i18n.translate('xpack.monitoring.alerts.clusterStatus.serverLog', {
            defaultMessage: `Cluster health alert is {state} for {clusterName}. Current health is {clusterHealth}. {action}`,
            values: {
              state: '{{context.state}}',
              clusterHealth: '{{context.clusterHealth}}',
              clusterName: '{{context.clusterName}}',
              action: '{{context.action}}',
            },
          }),
        };
    }
    return null;
  }
}
