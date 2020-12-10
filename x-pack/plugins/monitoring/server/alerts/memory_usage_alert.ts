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
  AlertMemoryUsageState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertFilter,
  CommonAlertParams,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_MEMORY_USAGE,
  ALERT_DETAILS,
} from '../../common/constants';
import { fetchMemoryUsageNodeStats } from '../lib/alerts/fetch_memory_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance, SanitizedAlert } from '../../../alerts/common';
import { AlertingDefaults, createLink } from './alert_helpers';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { parseDuration } from '../../../alerts/common/parse_duration';
import { Globals } from '../static_globals';

export class MemoryUsageAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_MEMORY_USAGE,
      name: ALERT_DETAILS[ALERT_MEMORY_USAGE].label,
      accessorKey: 'memoryUsage',
      defaultParams: {
        threshold: 85,
        duration: '5m',
      },
      actionVariables: [
        {
          name: 'nodes',
          description: i18n.translate('xpack.monitoring.alerts.memoryUsage.actionVariables.nodes', {
            defaultMessage: 'The list of nodes reporting high memory usage.',
          }),
        },
        {
          name: 'count',
          description: i18n.translate('xpack.monitoring.alerts.memoryUsage.actionVariables.count', {
            defaultMessage: 'The number of nodes reporting high memory usage.',
          }),
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
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const { duration, threshold } = params;
    const parsedDuration = parseDuration(duration as string);
    const endMs = +new Date();
    const startMs = endMs - parsedDuration;

    const stats = await fetchMemoryUsageNodeStats(
      callCluster,
      clusters,
      esIndexPattern,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size
    );

    return stats.map((stat) => {
      const { clusterUuid, memoryUsage, ccs } = stat;
      return {
        shouldFire: memoryUsage > threshold!,
        severity: AlertSeverity.Danger,
        meta: stat,
        clusterUuid,
        ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    return super.filterAlertInstance(alertInstance, filters, true);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const currentState = super.getDefaultAlertState(cluster, item);
    currentState.ui.severity = AlertSeverity.Warning;
    return currentState;
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const stat = item.meta as AlertMemoryUsageState;
    return {
      text: i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting JVM memory usage of {memoryUsage}% at #absolute`,
        values: {
          nodeName: stat.nodeName,
          memoryUsage: stat.memoryUsage,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.tuneThreadPools', {
            defaultMessage: '#start_linkTune thread pools#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/modules-threadpool.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.managingHeap', {
            defaultMessage: '#start_linkManaging ES Heap#end_link',
          }),
          `{elasticWebsiteUrl}blog/a-heap-of-trouble`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.identifyIndicesShards', {
            defaultMessage: '#start_linkIdentify large indices/shards#end_link',
          }),
          'elasticsearch/indices',
          AlertMessageTokenType.Link
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.addMoreNodes', {
            defaultMessage: '#start_linkAdd more data nodes#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/add-elasticsearch-nodes.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.resizeYourDeployment', {
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
    ) as AlertMemoryUsageState[];
    const firingCount = firingNodes.length;

    if (firingCount > 0) {
      const shortActionText = i18n.translate('xpack.monitoring.alerts.memoryUsage.shortAction', {
        defaultMessage: 'Verify memory usage levels across affected nodes.',
      });
      const fullActionText = i18n.translate('xpack.monitoring.alerts.memoryUsage.fullAction', {
        defaultMessage: 'View nodes',
      });

      const ccs = alertStates.find((state) => state.ccs)?.ccs;
      const globalStateLink = this.createGlobalStateLink(
        'elasticsearch/nodes',
        cluster.clusterUuid,
        ccs
      );
      const action = `[${fullActionText}](${globalStateLink})`;
      const internalShortMessage = i18n.translate(
        'xpack.monitoring.alerts.memoryUsage.firing.internalShortMessage',
        {
          defaultMessage: `Memory usage alert is firing for {count} node(s) in cluster: {clusterName}. {shortActionText}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      );
      const internalFullMessage = i18n.translate(
        'xpack.monitoring.alerts.memoryUsage.firing.internalFullMessage',
        {
          defaultMessage: `Memory usage alert is firing for {count} node(s) in cluster: {clusterName}. {action}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            action,
          },
        }
      );

      instance.scheduleActions('default', {
        internalShortMessage,
        internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
        state: AlertingDefaults.ALERT_STATE.firing,
        nodes: firingNodes
          .map((state) => `${state.nodeName}:${state.memoryUsage.toFixed(2)}`)
          .join(','),
        count: firingCount,
        clusterName: cluster.clusterName,
        action,
        actionPlain: shortActionText,
      });
    }
  }
}
