/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { ElasticsearchClient } from 'kibana/server';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertDiskUsageState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  AlertDiskUsageNodeStats,
  CommonAlertFilter,
} from '../../common/types/alerts';
import { Alert } from '../../../alerting/server';
import { RULE_DISK_USAGE, RULE_DETAILS } from '../../common/constants';
// @ts-ignore
import { ROUNDED_FLOAT } from '../../common/formatting';
import { fetchDiskUsageNodeStats } from '../lib/alerts/fetch_disk_usage_node_stats';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance, SanitizedAlert } from '../../../alerting/common';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

export class DiskUsageRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedAlert) {
    super(sanitizedRule, {
      id: RULE_DISK_USAGE,
      name: RULE_DETAILS[RULE_DISK_USAGE].label,
      accessorKey: 'diskUsage',
      defaultParams: {
        threshold: 80,
        duration: '5m',
      },
      actionVariables: [
        {
          name: 'node',
          description: i18n.translate('xpack.monitoring.alerts.diskUsage.actionVariables.node', {
            defaultMessage: 'The node reporting high disk usage.',
          }),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }

  protected async fetchData(
    params: CommonAlertParams,
    esClient: ElasticsearchClient,
    clusters: AlertCluster[]
  ): Promise<AlertData[]> {
    const { duration, threshold } = params;
    const stats = await fetchDiskUsageNodeStats(
      esClient,
      clusters,
      duration as string,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );

    return stats.map((stat) => {
      const { clusterUuid, diskUsage, ccs } = stat;
      return {
        shouldFire: diskUsage > threshold!,
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
    const stat = item.meta as AlertDiskUsageNodeStats;
    return {
      text: i18n.translate('xpack.monitoring.alerts.diskUsage.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting disk usage of {diskUsage}% at #absolute`,
        values: {
          nodeName: stat.nodeName,
          diskUsage: numeral(stat.diskUsage).format(ROUNDED_FLOAT),
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
    instance: Alert,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (alertStates.length === 0) {
      return;
    }
    const firingNode = alertStates[0] as AlertDiskUsageState;
    if (!firingNode || !firingNode.ui.isFiring) {
      return;
    }

    const shortActionText = i18n.translate('xpack.monitoring.alerts.diskUsage.shortAction', {
      defaultMessage: 'Verify disk usage level of node.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.diskUsage.fullAction', {
      defaultMessage: 'View node',
    });
    const ccs = firingNode.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `elasticsearch/nodes/${firingNode.nodeId}`,
      cluster.clusterUuid,
      ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.diskUsage.firing.internalShortMessage',
      {
        defaultMessage: `Disk usage alert is firing for node {nodeName} in cluster: {clusterName}. {shortActionText}`,
        values: {
          clusterName: cluster.clusterName,
          nodeName: firingNode.nodeName,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.diskUsage.firing.internalFullMessage',
      {
        defaultMessage: `Disk usage alert is firing for node {nodeName} in cluster: {clusterName}. {action}`,
        values: {
          clusterName: cluster.clusterName,
          nodeName: firingNode.nodeName,
          action,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      /* continue to send "nodes" and "count" values for users before https://github.com/elastic/kibana/pull/102544
          see https://github.com/elastic/kibana/issues/100136#issuecomment-865229431
          */
      nodes: `${firingNode.nodeName}:${firingNode.diskUsage}`,
      count: 1,
      node: `${firingNode.nodeName}:${firingNode.diskUsage}`,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
