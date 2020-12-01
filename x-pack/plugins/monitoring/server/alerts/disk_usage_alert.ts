/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient, Logger } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertDiskUsageState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertFilter,
  CommonAlertParams,
} from '../../common/types/alerts';
import { AlertInstance, AlertServices } from '../../../alerts/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_DISK_USAGE,
  ALERT_DETAILS,
} from '../../common/constants';
import { fetchDiskUsageNodeStats } from '../lib/alerts/fetch_disk_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance } from '../../../alerts/common';
import { AlertingDefaults, createLink } from './alert_helpers';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';

export class DiskUsageAlert extends BaseAlert {
  public type = ALERT_DISK_USAGE;
  public label = ALERT_DETAILS[ALERT_DISK_USAGE].label;
  public description = ALERT_DETAILS[ALERT_DISK_USAGE].description;

  protected defaultParams = {
    threshold: 80,
    duration: '5m',
  };

  protected actionVariables = [
    {
      name: 'nodes',
      description: i18n.translate('xpack.monitoring.alerts.diskUsage.actionVariables.nodes', {
        defaultMessage: 'The list of nodes reporting high disk usage.',
      }),
    },
    {
      name: 'count',
      description: i18n.translate('xpack.monitoring.alerts.diskUsage.actionVariables.count', {
        defaultMessage: 'The number of nodes reporting high disk usage.',
      }),
    },
    ...Object.values(AlertingDefaults.ALERT_TYPE.context),
  ];

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = appendMetricbeatIndex(this.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const { duration, threshold } = params;
    const stats = await fetchDiskUsageNodeStats(
      callCluster,
      clusters,
      esIndexPattern,
      duration as string,
      this.config.ui.max_bucket_size
    );

    return stats.map((stat) => {
      const { clusterUuid, nodeId, diskUsage, ccs } = stat;
      return {
        instanceKey: `${clusterUuid}:${nodeId}`,
        shouldFire: diskUsage > threshold,
        severity: AlertSeverity.Danger,
        meta: stat,
        clusterUuid,
        ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    const alertInstanceStates = alertInstance.state?.alertStates as AlertDiskUsageState[];
    const nodeFilter = filters?.find((filter) => filter.nodeUuid);

    if (!filters || !filters.length || !alertInstanceStates?.length || !nodeFilter?.nodeUuid) {
      return true;
    }

    const nodeAlerts = alertInstanceStates.filter(({ nodeId }) => nodeId === nodeFilter.nodeUuid);
    return Boolean(nodeAlerts.length);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const currentState = super.getDefaultAlertState(cluster, item);
    currentState.ui.severity = AlertSeverity.Warning;
    return currentState;
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const stat = item.meta as AlertDiskUsageState;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.diskUsage.ui.resolvedMessage', {
          defaultMessage: `The disk usage on node {nodeName} is now under the threshold, currently reporting at {diskUsage}% as of #resolved`,
          values: {
            nodeName: stat.nodeName,
            diskUsage: stat.diskUsage.toFixed(2),
          },
        }),
        tokens: [
          {
            startToken: '#resolved',
            type: AlertMessageTokenType.Time,
            isAbsolute: true,
            isRelative: false,
            timestamp: alertState.ui.resolvedMS,
          } as AlertMessageTimeToken,
        ],
      };
    }
    return {
      text: i18n.translate('xpack.monitoring.alerts.diskUsage.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting disk usage of {diskUsage}% at #absolute`,
        values: {
          nodeName: stat.nodeName,
          diskUsage: stat.diskUsage,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.diskUsage.ui.nextSteps.tuneDisk', {
            defaultMessage: '#start_linkTune for disk usage#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/tune-for-disk-usage.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.diskUsage.ui.nextSteps.identifyIndices', {
            defaultMessage: '#start_linkIdentify large indices#end_link',
          }),
          'elasticsearch/indices',
          AlertMessageTokenType.Link
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.diskUsage.ui.nextSteps.ilmPolicies', {
            defaultMessage: '#start_linkImplement ILM policies#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/index-lifecycle-management.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.diskUsage.ui.nextSteps.addMoreNodes', {
            defaultMessage: '#start_linkAdd more data nodes#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/add-elasticsearch-nodes.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.diskUsage.ui.nextSteps.resizeYourDeployment', {
            defaultMessage: '#start_linkResize your deployment (ECE)#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/cloud-enterprise/current/ece-resize-deployment.html`
        ),
      ],
      tokens: [
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: alertState.ui.triggeredMS,
        } as AlertMessageTimeToken,
        {
          startToken: '#start_link',
          endToken: '#end_link',
          type: AlertMessageTokenType.Link,
          url: `elasticsearch/nodes/${stat.nodeId}`,
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected executeActions(
    instance: AlertInstance,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    const firingNodes = alertStates.filter(
      (alertState) => alertState.ui.isFiring
    ) as AlertDiskUsageState[];
    const firingCount = firingNodes.length;

    if (firingCount > 0) {
      const shortActionText = i18n.translate('xpack.monitoring.alerts.diskUsage.shortAction', {
        defaultMessage: 'Verify disk usage levels across affected nodes.',
      });
      const fullActionText = i18n.translate('xpack.monitoring.alerts.diskUsage.fullAction', {
        defaultMessage: 'View nodes',
      });

      const action = `[${fullActionText}](elasticsearch/nodes)`;
      const internalShortMessage = i18n.translate(
        'xpack.monitoring.alerts.diskUsage.firing.internalShortMessage',
        {
          defaultMessage: `Disk usage alert is firing for {count} node(s) in cluster: {clusterName}. {shortActionText}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      );
      const internalFullMessage = i18n.translate(
        'xpack.monitoring.alerts.diskUsage.firing.internalFullMessage',
        {
          defaultMessage: `Disk usage alert is firing for {count} node(s) in cluster: {clusterName}. {action}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            action,
          },
        }
      );

      instance.scheduleActions('default', {
        internalShortMessage,
        internalFullMessage: this.isCloud ? internalShortMessage : internalFullMessage,
        state: AlertingDefaults.ALERT_STATE.firing,
        nodes: firingNodes
          .map((state) => `${state.nodeName}:${state.diskUsage.toFixed(2)}`)
          .join(','),
        count: firingCount,
        clusterName: cluster.clusterName,
        action,
        actionPlain: shortActionText,
      });
    } else {
      const resolvedNodes = (alertStates as AlertDiskUsageState[])
        .filter((state) => !state.ui.isFiring)
        .map((state) => `${state.nodeName}:${state.diskUsage.toFixed(2)}`);
      const resolvedCount = resolvedNodes.length;

      if (resolvedCount > 0) {
        const internalMessage = i18n.translate(
          'xpack.monitoring.alerts.diskUsage.resolved.internalMessage',
          {
            defaultMessage: `Disk usage alert is resolved for {count} node(s) in cluster: {clusterName}.`,
            values: {
              count: resolvedCount,
              clusterName: cluster.clusterName,
            },
          }
        );

        instance.scheduleActions('default', {
          internalShortMessage: internalMessage,
          internalFullMessage: internalMessage,
          state: AlertingDefaults.ALERT_STATE.resolved,
          nodes: resolvedNodes.join(','),
          count: resolvedCount,
          clusterName: cluster.clusterName,
        });
      }
    }
  }

  protected async processData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: AlertServices,
    logger: Logger,
    state: any
  ) {
    const currentUTC = +new Date();
    for (const cluster of clusters) {
      const nodes = data.filter((node) => node.clusterUuid === cluster.clusterUuid);
      if (!nodes.length) {
        continue;
      }

      const firingNodeUuids = nodes
        .filter((node) => node.shouldFire)
        .map((node) => node.meta.nodeId)
        .join(',');
      const instanceId = `${this.type}:${cluster.clusterUuid}:${firingNodeUuids}`;
      const instance = services.alertInstanceFactory(instanceId);
      const newAlertStates: AlertDiskUsageState[] = [];

      for (const node of nodes) {
        const stat = node.meta as AlertDiskUsageState;
        const nodeState = this.getDefaultAlertState(cluster, node) as AlertDiskUsageState;
        nodeState.diskUsage = stat.diskUsage;
        nodeState.nodeId = stat.nodeId;
        nodeState.nodeName = stat.nodeName;

        if (node.shouldFire) {
          nodeState.ui.triggeredMS = currentUTC;
          nodeState.ui.isFiring = true;
          nodeState.ui.severity = node.severity;
          newAlertStates.push(nodeState);
        }
        nodeState.ui.message = this.getUiMessage(nodeState, node);
      }

      const alertInstanceState = { alertStates: newAlertStates };
      instance.replaceState(alertInstanceState);
      if (newAlertStates.length) {
        this.executeActions(instance, alertInstanceState, null, cluster);
        state.lastExecutedAction = currentUTC;
      }
    }

    state.lastChecked = currentUTC;
    return state;
  }
}
