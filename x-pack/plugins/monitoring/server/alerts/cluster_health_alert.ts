/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'kibana/server';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageLinkToken,
  CommonAlertParams,
  AlertClusterHealth,
  AlertInstanceState,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerting/server';
import {
  ALERT_CLUSTER_HEALTH,
  LEGACY_ALERT_DETAILS,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../common/constants';
import { AlertMessageTokenType, AlertClusterHealthType, AlertSeverity } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerting/common';
import { Globals } from '../static_globals';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { fetchClusterHealth } from '../lib/alerts/fetch_cluster_health';

const RED_STATUS_MESSAGE = i18n.translate('xpack.monitoring.alerts.clusterHealth.redMessage', {
  defaultMessage: 'Allocate missing primary and replica shards',
});

const YELLOW_STATUS_MESSAGE = i18n.translate(
  'xpack.monitoring.alerts.clusterHealth.yellowMessage',
  {
    defaultMessage: 'Allocate missing replica shards',
  }
);

export class ClusterHealthAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_CLUSTER_HEALTH,
      name: LEGACY_ALERT_DETAILS[ALERT_CLUSTER_HEALTH].label,
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
    esClient: ElasticsearchClient,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const healths = await fetchClusterHealth(esClient, clusters, esIndexPattern);
    return healths.map((clusterHealth) => {
      const shouldFire = clusterHealth.health !== AlertClusterHealthType.Green;
      const severity =
        clusterHealth.health === AlertClusterHealthType.Red
          ? AlertSeverity.Danger
          : AlertSeverity.Warning;

      return {
        shouldFire,
        severity,
        meta: clusterHealth,
        clusterUuid: clusterHealth.clusterUuid,
        ccs: clusterHealth.ccs,
      };
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const { health } = item.meta as AlertClusterHealth;
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
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (alertStates.length === 0) {
      return;
    }

    // Logic in the base alert assumes that all alerts will operate against multiple nodes/instances (such as a CPU alert against ES nodes)
    // However, some alerts operate on the state of the cluster itself and are only concerned with a single state
    const state = alertStates[0];
    const { health } = state.meta as AlertClusterHealth;
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
