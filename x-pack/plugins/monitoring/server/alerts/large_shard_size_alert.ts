/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
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
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_LARGE_SHARD_SIZE,
  ALERT_DETAILS,
} from '../../common/constants';
import { fetchIndexShardSize } from '../lib/alerts/fetch_index_shard_size';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { SanitizedAlert, RawAlertInstance } from '../../../alerts/common';
import { AlertingDefaults, createLink } from './alert_helpers';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { Globals } from '../static_globals';

const MAX_INDICES_LIST = 10;
export class LargeShardSizeAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_LARGE_SHARD_SIZE,
      name: ALERT_DETAILS[ALERT_LARGE_SHARD_SIZE].label,
      throttle: '12h',
      defaultParams: { indexPattern: '*', threshold: 55 },
      actionVariables: [
        {
          name: 'shardIndices',
          description: i18n.translate(
            'xpack.monitoring.alerts.shardSize.actionVariables.shardIndex',
            {
              defaultMessage: 'List of indices which are experiencing large shard size.',
            }
          ),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }

  protected async fetchData(
    params: CommonAlertParams & { indexPattern: string },
    callCluster: any,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const { threshold, indexPattern: shardIndexPatterns } = params;

    const stats = await fetchIndexShardSize(
      callCluster,
      clusters,
      esIndexPattern,
      threshold!,
      shardIndexPatterns,
      Globals.app.config.ui.max_bucket_size
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
        defaultMessage: `The following index: #start_link{shardIndex}#end_link has a large shard size of: {shardSize}GB at #absolute`,
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
    instance: AlertInstance,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    let sortedAlertStates = alertStates.slice(0).sort((alertStateA, alertStateB) => {
      const { meta: metaA } = alertStateA as { meta?: IndexShardSizeUIMeta };
      const { meta: metaB } = alertStateB as { meta?: IndexShardSizeUIMeta };
      return metaB!.shardSize - metaA!.shardSize;
    });

    let suffix = '';
    if (sortedAlertStates.length > MAX_INDICES_LIST) {
      const diff = sortedAlertStates.length - MAX_INDICES_LIST;
      sortedAlertStates = sortedAlertStates.slice(0, MAX_INDICES_LIST);
      suffix = `, and ${diff} more`;
    }

    const shardIndices =
      sortedAlertStates
        .map((alertState) => (alertState.meta as IndexShardSizeUIMeta).shardIndex)
        .join(', ') + suffix;

    const shortActionText = i18n.translate('xpack.monitoring.alerts.shardSize.shortAction', {
      defaultMessage: 'Investigate indices with large shard sizes.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.shardSize.fullAction', {
      defaultMessage: 'View index shard size stats',
    });

    const ccs = alertStates.find((state) => state.ccs)?.ccs;
    const globalStateLink = this.createGlobalStateLink(
      'elasticsearch/indices',
      cluster.clusterUuid,
      ccs
    );

    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.shardSize.firing.internalShortMessage',
      {
        defaultMessage: `Large shard size alert is firing for the following indices: {shardIndices}. {shortActionText}`,
        values: {
          shardIndices,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.shardSize.firing.internalFullMessage',
      {
        defaultMessage: `Large shard size alert is firing for the following indices: {shardIndices}. {action}`,
        values: {
          action,
          shardIndices,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      shardIndices,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
