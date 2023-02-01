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
import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

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
import { runDataQualityCheck } from './data_quality/run_data_quality_check';

export const fetchMappings = async (
  client: ElasticsearchClient,
  indexName: string
): Promise<Record<string, IndicesGetMappingIndexMappingRecord>> =>
  await client.indices.getMapping({
    expand_wildcards: ['open'],
    index: indexName,
  });

async function fetchDataQuality(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  startMs: number,
  endMs: number,
  maxBucketSize: number,
  filterQuery: string | undefined
): Promise<AlertDataQualityStats[]> {
  const { indices = {} } = await esClient.indices.stats();

  const cluster = clusters[0];

  const checkResults = await runDataQualityCheck(
    esClient,
    Object.keys(indices),
    `${startMs}`,
    `${endMs}`
  );

  const results: AlertDataQualityStats[] = checkResults.map(([indexName, fieldCheckSummary]) => {
    return {
      indexName,
      unallowedValues: fieldCheckSummary.length,
      clusterUuid: cluster.clusterUuid,
    };
  });

  return results;
}

export class DataQualityRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedRule) {
    super(sanitizedRule, {
      id: RULE_DATA_QUALITY,
      name: RULE_DETAILS[RULE_DATA_QUALITY].label,
      accessorKey: 'dataQuality',
      defaultParams: {
        threshold: 1,
        duration: '1m',
      },
      actionVariables: [
        {
          name: 'cluster',
          description: i18n.translate('xpack.monitoring.alerts.dataQuality.actionVariables.node', {
            defaultMessage: 'The cluster reporting data quality issues.',
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
    const duration = parseDuration(params.duration);
    const endMs = +new Date();
    const startMs = endMs - duration;
    const stats = await fetchDataQuality(
      esClient,
      clusters,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );

    const [firstCluster] = clusters;

    return stats.map((stat) => {
      return {
        clusterUuid: firstCluster.clusterUuid,
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
      text: i18n.translate('xpack.monitoring.alerts.dataQuality.ui.firingMessage', {
        defaultMessage: `Cluster {clusterUuid} is reporting {unallowedValues} unallowed values at #absolute`,
        values: {
          clusterUuid: stat.clusterUuid,
          unallowedValues: numeral(stat.unallowedValues).format(ROUNDED_FLOAT),
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.dataQuality.ui.nextSteps.hotThreads', {
            defaultMessage:
              '#start_linkInvestigate data quality using dedicated dashboard#end_link',
          }),
          `security/data_quality`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.dataQuality.ui.nextSteps.hotThreads', {
            defaultMessage: '#start_linkRead about Elastic Common Schema#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/ecs/{docLinkVersion}/ecs-reference.html`
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
    const shortActionText = i18n.translate('xpack.monitoring.alerts.dataQuality.shortAction', {
      defaultMessage: 'Verify cluster data quality.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.dataQuality.fullAction', {
      defaultMessage: 'Verify cluster data quality',
    });

    const ccs = firingNode.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `app/management/insightsAndAlerting/triggersActions/rules`,
      cluster.clusterUuid,
      ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.dataQuality.firing.internalShortMessage',
      {
        defaultMessage: `Data quality is firing in cluster: {clusterName}. {shortActionText}`,
        values: {
          clusterName: cluster.clusterName,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.dataQuality.firing.internalFullMessage',
      {
        defaultMessage: `Data quality alert is firing in cluster: {clusterName}. {action}`,
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
