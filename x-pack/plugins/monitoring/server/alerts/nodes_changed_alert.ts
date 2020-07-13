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
  AlertInstanceState,
  LegacyAlert,
  LegacyAlertNodesChangedList,
} from './types';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  ALERT_NODES_CHANGED,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { CommonAlertParams } from '../../common/types';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { mapLegacySeverity } from '../lib/alerts/map_legacy_severity';

const WATCH_NAME = 'elasticsearch_nodes';
const RESOLVED = i18n.translate('xpack.monitoring.alerts.nodesChanged.resolved', {
  defaultMessage: 'resolved',
});
const FIRING = i18n.translate('xpack.monitoring.alerts.nodesChanged.firing', {
  defaultMessage: 'firing',
});

export class NodesChangedAlert extends BaseAlert {
  public type = ALERT_NODES_CHANGED;
  public label = 'Nodes changed';
  public isLegacy = true;

  protected actionVariables = [
    { name: 'state', description: 'The current state of the alert.' },
    { name: 'clusterName', description: 'The name of the cluster to which the nodes belong.' },
    { name: 'added', description: 'The list of nodes added to the cluster.' },
    { name: 'removed', description: 'The list of nodes removed from the cluster.' },
    { name: 'restarted', description: 'The list of nodes restarted in the cluster.' },
  ];

  private getNodeStates(legacyAlert: LegacyAlert): LegacyAlertNodesChangedList | undefined {
    return legacyAlert.nodes;
  }

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
        shouldFire: true, // This alert always has a resolved timestamp
        severity: mapLegacySeverity(legacyAlert.metadata.severity),
        meta: legacyAlert,
        ccs: null,
      });
      return accum;
    }, []);
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    const states = this.getNodeStates(legacyAlert) || { added: {}, removed: {}, restarted: {} };
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.resolvedMessage', {
          defaultMessage: `No changes detected in Elasticsearch nodes for this cluster.`,
        }),
      };
    }

    const addedText =
      Object.values(states.added).length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.addedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{added}' added to this cluster.`,
            values: {
              added: Object.values(states.added).join(','),
            },
          })
        : null;
    const removedText =
      Object.values(states.removed).length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.removedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{removed}' removed from this cluster.`,
            values: {
              removed: Object.values(states.removed).join(','),
            },
          })
        : null;
    const restartedText =
      Object.values(states.restarted).length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.restartedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{restarted}' restarted in this cluster.`,
            values: {
              restarted: Object.values(states.restarted).join(','),
            },
          })
        : null;

    return {
      text: [addedText, removedText, restartedText].filter(Boolean).join(' '),
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
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        state: RESOLVED,
        clusterName: cluster.clusterName,
      });
    } else {
      const states = this.getNodeStates(legacyAlert) || { added: {}, removed: {}, restarted: {} };
      instance.scheduleActions('default', {
        state: FIRING,
        clusterName: cluster.clusterName,
        added: Object.values(states.added).join(','),
        removed: Object.values(states.removed).join(','),
        restarted: Object.values(states.restarted).join(','),
      });
    }
  }

  public getDefaultActionParams(actionTypeId: string) {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {
          subject: i18n.translate('xpack.monitoring.alerts.nodesChanged.emailSubject', {
            defaultMessage: `Elasticsearch nodes changed alert is {state} for {clusterName}`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
          message: i18n.translate('xpack.monitoring.alerts.nodesChanged.emailMessage', {
            defaultMessage: `The following Elasticsearch nodes in {clusterName} have been added:{added} removed:{removed} restarted:{restarted}`,
            values: {
              added: '{{context.added}}',
              removed: '{{context.removed}}',
              restarted: '{{context.restarted}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
        };
      case ALERT_ACTION_TYPE_LOG:
        return {
          message: i18n.translate('xpack.monitoring.alerts.nodesChanged.serverLog', {
            defaultMessage: `Elasticsearch nodes changed alert is {state} for {clusterName}`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
        };
    }
    return null;
  }
}
