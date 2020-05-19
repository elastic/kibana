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
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertClusterStateState,
  AlertClusterState,
} from './types';
import { AlertInstance, AlertExecutorOptions } from '../../../alerting/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_CLUSTER_STATE,
  ALERT_ACTION_TYPE_LOG,
  ALERT_ACTION_TYPE_EMAIL,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertClusterStateType, AlertSeverity } from '../../common/enums';
import { fetchDefaultEmailAddress } from '../lib/alerts/fetch_default_email_address';
import { fetchClusterState } from '../lib/alerts/fetch_cluster_state';

const RESOLVED_SUBJECT = i18n.translate('xpack.monitoring.alerts.clusterStatus.resolvedSubject', {
  defaultMessage: 'RESOLVED X-Pack Monitoring: Cluster Status',
});

const NEW_SUBJECT = i18n.translate('xpack.monitoring.alerts.clusterStatus.newSubject', {
  defaultMessage: 'NEW X-Pack Monitoring: Cluster Status',
});

const RED_STATUS_MESSAGE = i18n.translate('xpack.monitoring.alerts.clusterStatus.redMessage', {
  defaultMessage: 'Allocate missing primary and replica shards',
});

const YELLOW_STATUS_MESSAGE = i18n.translate(
  'xpack.monitoring.alerts.clusterStatus.yellowMessage',
  {
    defaultMessage: 'Allocate missing replica shards',
  }
);

export class ClusterStateAlert extends BaseAlert {
  public type = ALERT_CLUSTER_STATE;
  public label = 'Cluster state';

  protected emailAddress: string = '';

  protected async execute(options: AlertExecutorOptions): Promise<any> {
    await super.execute(options);

    const uiSettings = (await this.getUiSettingsService()).asScopedToClient(
      options.services.savedObjectsClient
    );
    this.emailAddress = await fetchDefaultEmailAddress(uiSettings);
  }

  protected async fetchData(
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const clusterStates = await fetchClusterState(callCluster, clusters, esIndexPattern);
    return clusterStates.map(clusterState => {
      const shouldFire = clusterState.state !== AlertClusterStateType.Green;
      const severity =
        clusterState.state === AlertClusterStateType.Red
          ? AlertSeverity.Danger
          : AlertSeverity.Warning;

      return {
        instanceKey: `${clusterState.clusterUuid}`,
        clusterUuid: clusterState.clusterUuid,
        shouldFire,
        severity,
        meta: clusterState,
      };
    });
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertClusterState {
    const clusterState = item.meta as AlertClusterStateState;
    return {
      cluster,
      state: clusterState.state,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Danger,
        resolvedMS: 0,
        triggeredMS: 0,
        lastCheckedMS: 0,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const clusterState = item.meta as AlertClusterStateState;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.resolvedMessage', {
          defaultMessage: `Elasticsearch cluster status is green.`,
        }),
      };
    }

    return {
      text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.firingMessage', {
        defaultMessage: `Elasticsearch cluster status is {status}.`,
        values: {
          status: clusterState.state,
        },
      }),
      nextSteps: [
        {
          text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.nextSteps.message1', {
            defaultMessage: `{message}. #start_linkView now#end_link`,
            values: {
              message:
                clusterState.state === AlertClusterStateType.Red
                  ? RED_STATUS_MESSAGE
                  : YELLOW_STATUS_MESSAGE,
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
    alertState: AlertState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    const clusterState = item.meta as AlertClusterStateState;
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        state: 'resolved',
        clusterState: clusterState.state,
        clusterName: cluster.clusterName,
      });
    } else {
      instance.scheduleActions('default', {
        state: 'firing',
        clusterState: clusterState.state,
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
            defaultMessage: `Cluster status alert is {state} for {clusterName}. Current state is {clusterState}.`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
              clusterState: '{{context.clusterState}}',
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
            defaultMessage: `Cluster status alert is {state} for {clusterName}. Current state is {clusterState}. {action}`,
            values: {
              state: '{{context.state}}',
              clusterState: '{{context.clusterState}}',
              clusterName: '{{context.clusterName}}',
              action: '{{context.action}}',
            },
          }),
        };
    }
    return null;
  }
}
