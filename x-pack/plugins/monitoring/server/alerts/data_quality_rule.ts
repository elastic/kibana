/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { ElasticsearchClient } from '@kbn/core/server';
import { Alert } from '@kbn/alerting-plugin/server';
import { RawAlertInstance, SanitizedRule } from '@kbn/alerting-plugin/common';
import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  CommonAlertFilter,
  AlertDataQualityStats,
  AlertDataQualityState,
} from '../../common/types/alerts';
import { RULE_DATA_QUALITY, RULE_DETAILS } from '../../common/constants';
import { ROUNDED_FLOAT } from '../../common/formatting';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

async function fetchKibanaNodeRules(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  startMs: number,
  endMs: number,
  max_bucket_size: number,
  filterQuery: string | undefined
): Promise<AlertDataQualityStats[]> {
  throw new Error('Function not implemented.');
}

export class DataQualityRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedRule) {
    super(sanitizedRule, {
      id: RULE_DATA_QUALITY,
      name: RULE_DETAILS[RULE_DATA_QUALITY].label,
      accessorKey: 'rulesFailure',
      defaultParams: {
        threshold: 1,
        duration: '1m',
      },
      actionVariables: [
        {
          name: 'cluster',
          description: i18n.translate(
            'xpack.monitoring.alerts.rulesFailures.actionVariables.node',
            {
              defaultMessage: 'The cluster reporting rules falures.',
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
    clusters: AlertCluster[]
  ): Promise<AlertData[]> {
    const duration = parseDuration(params.duration);
    const endMs = +new Date();
    const startMs = endMs - duration;
    const stats = await fetchKibanaNodeRules(
      esClient,
      clusters,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );
    return stats.map((stat) => {
      return {
        clusterUuid: stat.clusterUuid,
        shouldFire: stat.unallowedValues > 0,
        severity: AlertSeverity.Warning,
        meta: stat,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    return super.filterAlertInstance(alertInstance, filters, true);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const base = super.getDefaultAlertState(cluster, item);
    return {
      ...base,
      ui: {
        ...base.ui,
        severity: AlertSeverity.Warning,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const stat = item.meta as AlertDataQualityStats;
    return {
      text: i18n.translate('xpack.monitoring.alerts.rulesFailures.ui.firingMessage', {
        defaultMessage: `Cluster {clusterUuid} is reporting unallowed values of {unallowedValues}% at #absolute`,
        values: {
          clusterUuid: stat.clusterUuid,
          unallowedValues: numeral(stat.unallowedValues).format(ROUNDED_FLOAT),
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.rulesFailures.ui.nextSteps.hotThreads', {
            defaultMessage: '#start_linkCheck hot threads#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/cluster-nodes-hot-threads.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.rulesFailures.ui.nextSteps.runningTasks', {
            defaultMessage: '#start_linkCheck long running tasks#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/tasks.html`
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
          url: `app/management/insightsAndAlerting/triggersActions/rules`,
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
    const firingNode = alertStates[0] as AlertDataQualityState;
    if (!firingNode || !firingNode.ui.isFiring) {
      return;
    }
    const shortActionText = i18n.translate('xpack.monitoring.alerts.rulesFailures.shortAction', {
      defaultMessage: 'Verify cluster rules.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.rulesFailures.fullAction', {
      defaultMessage: 'Verify cluster rules',
    });

    const ccs = firingNode.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `app/management/insightsAndAlerting/triggersActions/rules`,
      cluster.clusterUuid,
      ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.rulesFailures.firing.internalShortMessage',
      {
        defaultMessage: `Rules failures is firing in cluster: {clusterName}. {shortActionText}`,
        values: {
          clusterName: cluster.clusterName,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.rulesFailures.firing.internalFullMessage',
      {
        defaultMessage: `Rules failures alert is firing in cluster: {clusterName}. {action}`,
        values: {
          clusterName: cluster.clusterName,
          action,
        },
      }
    );
    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      nodes: `${firingNode.nodeName}:${firingNode.failures}`,
      count: 1,
      node: `${firingNode.nodeName}:${firingNode.failures}`,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
