/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'kibana/server';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  IndexShardSizeUIMeta,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  CommonAlertFilter,
  IndexShardSizeStats,
} from '../../common/types/alerts';
import { Alert } from '../../../alerting/server';
import { RULE_LARGE_SHARD_SIZE, RULE_DETAILS } from '../../common/constants';
import { fetchIndexShardSize } from '../lib/alerts/fetch_index_shard_size';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { SanitizedRule, RawAlertInstance } from '../../../alerting/common';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

export class LargeShardSizeRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedRule) {
    super(sanitizedRule, {
      id: RULE_LARGE_SHARD_SIZE,
      name: RULE_DETAILS[RULE_LARGE_SHARD_SIZE].label,
      throttle: '12h',
      defaultParams: { indexPattern: '-.*', threshold: 55 },
      actionVariables: [
        {
          name: 'shardIndex',
          description: i18n.translate(
            'xpack.monitoring.alerts.shardSize.actionVariables.shardIndex',
            {
              defaultMessage: 'The index experiencing large average shard size.',
            }
          ),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }

  protected async fetchData(
    params: CommonAlertParams & { indexPattern: string },
    esClient: ElasticsearchClient,
    clusters: AlertCluster[]
  ): Promise<AlertData[]> {
    const { threshold, indexPattern: shardIndexPatterns } = params;

    const stats = await fetchIndexShardSize(
      esClient,
      clusters,
      threshold!,
      shardIndexPatterns,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );

    return stats.map((stat) => {
      const { shardIndex, shardSize, clusterUuid, ccs } = stat;
      return {
        shouldFire: true,
        severity: AlertSeverity.Danger,
        meta: {
          shardIndex,
          shardSize,
          instanceId: `${clusterUuid}:${shardIndex}`,
          itemLabel: shardIndex,
        },
        clusterUuid,
        ccs,
      };
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const { shardIndex, shardSize } = item.meta as IndexShardSizeUIMeta;
    return {
      text: i18n.translate('xpack.monitoring.alerts.shardSize.ui.firingMessage', {
        defaultMessage: `The following index: #start_link{shardIndex}#end_link has a large average shard size of: {shardSize}GB at #absolute`,
        values: {
          shardIndex,
          shardSize,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.shardSize.ui.nextSteps.investigateIndex', {
            defaultMessage: '#start_linkInvestigate detailed index stats#end_link',
          }),
          `elasticsearch/indices/${shardIndex}/advanced`,
          AlertMessageTokenType.Link
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.shardSize.ui.nextSteps.sizeYourShards', {
            defaultMessage: '#start_linkHow to size your shards (Docs)#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/current/size-your-shards.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.shardSize.ui.nextSteps.shardSizingBlog', {
            defaultMessage: '#start_linkShard sizing tips (Blog)#end_link',
          }),
          `{elasticWebsiteUrl}blog/how-many-shards-should-i-have-in-my-elasticsearch-cluster`
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
          url: `elasticsearch/indices/${shardIndex}`,
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected filterAlertInstance(
    alertInstance: RawAlertInstance,
    filters: Array<CommonAlertFilter & { shardIndex: string }>
  ) {
    const alertInstanceStates = alertInstance.state?.alertStates as AlertState[];
    const alertFilter = filters?.find((filter) => filter.shardIndex);
    if (!filters || !filters.length || !alertInstanceStates?.length || !alertFilter?.shardIndex) {
      return alertInstance;
    }
    const alertStates = alertInstanceStates.filter(
      ({ meta }) => (meta as IndexShardSizeStats).shardIndex === alertFilter.shardIndex
    );
    return { state: { alertStates } };
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
    const shardIndexMeta = alertStates[0].meta as IndexShardSizeUIMeta;
    const { shardIndex } = shardIndexMeta;

    const shortActionText = i18n.translate('xpack.monitoring.alerts.shardSize.shortAction', {
      defaultMessage: 'Investigate indices with large shard sizes.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.shardSize.fullAction', {
      defaultMessage: 'View index shard size stats',
    });

    const ccs = alertStates.find((state) => state.ccs)?.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `elasticsearch/indices/${shardIndex}`,
      cluster.clusterUuid,
      ccs
    );

    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.shardSize.firing.internalShortMessage',
      {
        defaultMessage: `Large shard size alert is firing for the following index: {shardIndex}. {shortActionText}`,
        values: {
          shardIndex,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.shardSize.firing.internalFullMessage',
      {
        defaultMessage: `Large shard size alert is firing for the following index: {shardIndex}. {action}`,
        values: {
          action,
          shardIndex,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      /* continue to send "shardIndices" values for users still using it though
        we have replaced it with shardIndex in the template due to alerts per index instead of all indices
        see https://github.com/elastic/kibana/issues/100136#issuecomment-865229431
        */
      shardIndices: shardIndex,
      shardIndex,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
