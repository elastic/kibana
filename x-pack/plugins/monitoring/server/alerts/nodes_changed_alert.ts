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
  AlertClusterStatsNode,
  AlertNodesChangedState,
  AlertInstanceState,
  AlertClusterStatsNodes,
} from './types';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_NODES_CHANGED,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertSeverity } from '../../common/enums';
import { fetchNodesFromClusterStats } from '../lib/alerts/fetch_nodes_from_cluster_stats';
import { CommonAlertParams } from '../../common/types';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';

const WATCH_NAME = 'elasticsearch_nodes';

interface AlertNodesChangedStates {
  removed: AlertClusterStatsNode[];
  added: AlertClusterStatsNode[];
  restarted: AlertClusterStatsNode[];
}

export class NodesChangedAlert extends BaseAlert {
  public type = ALERT_NODES_CHANGED;
  public label = 'Nodes changed';
  public isLegacy = true;

  private getNodeStates(nodes: AlertClusterStatsNodes): AlertNodesChangedStates {
    const removed = nodes.priorNodes.filter(
      (priorNode) =>
        !nodes.recentNodes.find((recentNode) => priorNode.nodeUuid === recentNode.nodeUuid)
    );
    const added = nodes.recentNodes.filter(
      (recentNode) =>
        !nodes.priorNodes.find((priorNode) => priorNode.nodeUuid === recentNode.nodeUuid)
    );
    const restarted = nodes.recentNodes.filter(
      (recentNode) =>
        nodes.priorNodes.find((priorNode) => priorNode.nodeUuid === recentNode.nodeUuid) &&
        !nodes.priorNodes.find(
          (priorNode) => priorNode.nodeEphemeralId === recentNode.nodeEphemeralId
        )
    );

    return {
      removed,
      added,
      restarted,
    };
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
    const [nodesFromClusterStats, legacyAlerts] = await Promise.all([
      await fetchNodesFromClusterStats(callCluster, clusters, esIndexPattern),
      await fetchLegacyAlerts(
        callCluster,
        clusters,
        alertIndexPattern,
        WATCH_NAME,
        this.config.ui.max_bucket_size
      ),
    ]);
    return legacyAlerts.reduce((accum: AlertData[], legacyAlert) => {
      const nodes = nodesFromClusterStats.find(
        (nodeFromClusterStats) =>
          nodeFromClusterStats.clusterUuid === legacyAlert.metadata.cluster_uuid
      );
      if (!nodes) {
        // This is potentially bad
        logger.warn(
          `Unable to map legacy alert status to node for ${legacyAlert.metadata.cluster_uuid}. No alert will show in the UI but it is assumed the alert has been resolved.`
        );
        return accum;
      }

      const { removed, added, restarted } = this.getNodeStates(nodes);

      const shouldFire = removed.length > 0 || added.length > 0 || restarted.length > 0;
      const severity = AlertSeverity.Warning;

      accum.push({
        instanceKey: `${nodes.clusterUuid}`,
        clusterUuid: nodes.clusterUuid,
        shouldFire,
        severity,
        meta: nodes,
        ccs: nodes.ccs,
      });
      return accum;
    }, []);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertNodesChangedState {
    const node = item.meta as AlertClusterStatsNode;
    return {
      cluster,
      ccs: null,
      node,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Success,
        resolvedMS: 0,
        triggeredMS: 0,
        lastCheckedMS: 0,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const nodes = item.meta as AlertClusterStatsNodes;
    const { removed, added, restarted } = this.getNodeStates(nodes);
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.resolvedMessage', {
          defaultMessage: `No changes detected in Elasticsearch nodes for this cluster.`,
        }),
      };
    }

    const addedText =
      added.length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.addedFiringMessage', {
            defaultMessage: `Elasticsearch nodes {added} added to this cluster.`,
            values: {
              added: added.map((node) => node.nodeName).join(','),
            },
          })
        : '';
    const removedText =
      removed.length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.removedFiringMessage', {
            defaultMessage: `Elasticsearch nodes {removed} removed from this cluster.`,
            values: {
              removed: removed.map((node) => node.nodeName).join(','),
            },
          })
        : '';
    const restartedText =
      restarted.length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.restartedFiringMessage', {
            defaultMessage: `Elasticsearch nodes {restarted} restarted in this cluster.`,
            values: {
              restarted: restarted.map((node) => node.nodeName).join(','),
            },
          })
        : '';

    return {
      text: `${addedText} ${removedText} ${restartedText}`,
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
    const nodes = item.meta as AlertClusterStatsNodes;
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        clusterName: cluster.clusterName,
      });
    } else {
      const { removed, added, restarted } = this.getNodeStates(nodes);
      instance.scheduleActions('default', {
        clusterName: cluster.clusterName,
        added: added.map((node) => node.nodeName).join(','),
        removed: removed.map((node) => node.nodeName).join(','),
        restarted: restarted.map((node) => node.nodeName).join(','),
      });
    }
  }

  public getDefaultActionParams(actionTypeId: string) {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {
          subject: i18n.translate('xpack.monitoring.alerts.nodesChanged.emailSubject', {
            defaultMessage: `Elasticsearch nodes have changed in {clusterName}`,
            values: {
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
            defaultMessage: `Elasticsearch nodes have changed in {clusterName}`,
            values: {
              clusterName: '{{context.clusterName}}',
            },
          }),
        };
    }
    return null;
  }
}
