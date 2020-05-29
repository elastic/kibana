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
  AlertClusterHealth,
  AlertClusterHealthState,
} from './types';
import { AlertInstance, AlertExecutorOptions } from '../../../alerting/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_ALERTS,
  ALERT_CLUSTER_HEALTH,
  ALERT_ACTION_TYPE_LOG,
  ALERT_ACTION_TYPE_EMAIL,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertClusterHealthType, AlertSeverity } from '../../common/enums';
import { fetchDefaultEmailAddress } from '../lib/alerts/fetch_default_email_address';
import { fetchClusterHealth } from '../lib/alerts/fetch_cluster_health';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
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

  protected emailAddress: string = '';

  protected async execute(options: AlertExecutorOptions): Promise<any> {
    await super.execute(options);

    const uiSettings = (await this.getUiSettingsService()).asScopedToClient(
      options.services.savedObjectsClient
    );
    this.emailAddress = await fetchDefaultEmailAddress(uiSettings);
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    const logger = this.getLogger(this.type);
    let alertIndexPattern = INDEX_ALERTS;
    if (availableCcs) {
      alertIndexPattern = getCcsIndexPattern(alertIndexPattern, availableCcs);
    }
    let esIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const [clustersHealth, legacyAlerts] = await Promise.all([
      await fetchClusterHealth(callCluster, clusters, esIndexPattern),
      await fetchLegacyAlerts(
        callCluster,
        clusters,
        alertIndexPattern,
        WATCH_NAME,
        this.config.ui.max_bucket_size
      ),
    ]);
    return legacyAlerts.reduce((accum: AlertData[], legacyAlert) => {
      const clusterHealth = clustersHealth.find(
        (health) => health.clusterUuid === legacyAlert.metadata.cluster_uuid
      );
      if (!clusterHealth) {
        // This is potentially bad
        logger.warn(
          `Unable to map legacy alert status to health check for ${legacyAlert.metadata.cluster_uuid}. No alert will show in the UI but it is assumed the alert has been resolved.`
        );
        return accum;
      }
      const shouldFire = clusterHealth.health !== AlertClusterHealthType.Green;
      const severity =
        clusterHealth.health === AlertClusterHealthType.Red
          ? AlertSeverity.Danger
          : AlertSeverity.Warning;

      accum.push({
        instanceKey: `${clusterHealth.clusterUuid}`,
        clusterUuid: clusterHealth.clusterUuid,
        shouldFire,
        severity,
        meta: clusterHealth,
      });
      return accum;
    }, []);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertClusterHealthState {
    const clusterHealth = item.meta as AlertClusterHealth;
    return {
      cluster,
      health: clusterHealth.health,
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
    const clusterHealth = item.meta as AlertClusterHealth;
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
          health: clusterHealth.health,
        },
      }),
      nextSteps: [
        {
          text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.nextSteps.message1', {
            defaultMessage: `{message}. #start_linkView now#end_link`,
            values: {
              message:
                clusterHealth.health === AlertClusterHealthType.Red
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
    const clusterHealth = item.meta as AlertClusterHealth;
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        state: 'resolved',
        clusterHealth: clusterHealth.health,
        clusterName: cluster.clusterName,
      });
    } else {
      instance.scheduleActions('default', {
        state: 'firing',
        clusterHealth: clusterHealth.health,
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
