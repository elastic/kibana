/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from '@kbn/core/server';
import { Alert } from '@kbn/alerting-plugin/server';
import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import { SanitizedRule, RawAlertInstance } from '@kbn/alerting-plugin/common';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  CCRReadExceptionsUIMeta,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  CommonAlertFilter,
  CCRReadExceptionsStats,
} from '../../common/types/alerts';
import { RULE_CCR_READ_EXCEPTIONS, RULE_DETAILS } from '../../common/constants';
import { fetchCCRReadExceptions } from '../lib/alerts/fetch_ccr_read_exceptions';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

export class CCRReadExceptionsRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedRule) {
    super(sanitizedRule, {
      id: RULE_CCR_READ_EXCEPTIONS,
      name: RULE_DETAILS[RULE_CCR_READ_EXCEPTIONS].label,
      throttle: '6h',
      defaultParams: {
        duration: '1h',
      },
      actionVariables: [
        {
          name: 'remoteCluster',
          description: i18n.translate(
            'xpack.monitoring.alerts.ccrReadExceptions.actionVariables.remoteCluster',
            {
              defaultMessage: 'The remote cluster experiencing CCR read exceptions.',
            }
          ),
        },
        {
          name: 'followerIndex',
          description: i18n.translate(
            'xpack.monitoring.alerts.ccrReadExceptions.actionVariables.followerIndex',
            {
              defaultMessage: 'The follower index reporting CCR read exceptions.',
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
    const { duration: durationString } = params;
    const duration = parseDuration(durationString);
    const endMs = +new Date();
    const startMs = endMs - duration;
    const stats = await fetchCCRReadExceptions(
      esClient,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );

    return stats.map((stat) => {
      const {
        remoteCluster,
        followerIndex,
        shardId,
        leaderIndex,
        lastReadException,
        clusterUuid,
        ccs,
      } = stat;
      return {
        shouldFire: true,
        severity: AlertSeverity.Danger,
        meta: {
          remoteCluster,
          followerIndex,
          shardId,
          leaderIndex,
          lastReadException,
          instanceId: `${remoteCluster}:${followerIndex}`,
          itemLabel: followerIndex,
        },
        clusterUuid,
        ccs,
      };
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const { remoteCluster, followerIndex, shardId, lastReadException } =
      item.meta as CCRReadExceptionsUIMeta;
    return {
      text: i18n.translate('xpack.monitoring.alerts.ccrReadExceptions.ui.firingMessage', {
        defaultMessage: `Follower index #start_link{followerIndex}#end_link is reporting CCR read exceptions on remote cluster: {remoteCluster} at #absolute`,
        values: {
          remoteCluster,
          followerIndex,
        },
      }),
      code: JSON.stringify(lastReadException, null, 2),
      nextSteps: [
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.ccrReadExceptions.ui.nextSteps.identifyCCRStats',
            {
              defaultMessage: '#start_linkIdentify CCR usage/stats#end_link',
            }
          ),
          'elasticsearch/ccr',
          AlertMessageTokenType.Link
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.ccrReadExceptions.ui.nextSteps.stackManagmentFollow',
            {
              defaultMessage: '#start_linkManage CCR follower indices#end_link',
            }
          ),
          `{basePath}management/data/cross_cluster_replication/follower_indices`
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.ccrReadExceptions.ui.nextSteps.stackManagmentAutoFollow',
            {
              defaultMessage: '#start_linkCreate auto-follow patterns#end_link',
            }
          ),
          `{basePath}management/data/cross_cluster_replication/auto_follow_patterns`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.ccrReadExceptions.ui.nextSteps.followerAPIDoc', {
            defaultMessage: '#start_linkAdd follower index API (Docs)#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/ccr-put-follow.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.ccrReadExceptions.ui.nextSteps.ccrDocs', {
            defaultMessage: '#start_linkCross-cluster replication (Docs)#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/xpack-ccr.html`
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.ccrReadExceptions.ui.nextSteps.biDirectionalReplication',
            {
              defaultMessage: '#start_linkBi-directional replication (Blog)#end_link',
            }
          ),
          `{elasticWebsiteUrl}blog/bi-directional-replication-with-elasticsearch-cross-cluster-replication-ccr`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.ccrReadExceptions.ui.nextSteps.followTheLeader', {
            defaultMessage: '#start_linkFollow the Leader (Blog)#end_link',
          }),
          `{elasticWebsiteUrl}blog/follow-the-leader-an-introduction-to-cross-cluster-replication-in-elasticsearch`
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
          url: `elasticsearch/ccr/${followerIndex}/shard/${shardId}`,
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    const alertInstanceStates = alertInstance.state?.alertStates as AlertState[];
    const alertFilter = filters?.find((filter) => filter.shardId);
    if (!filters || !filters.length || !alertInstanceStates?.length || !alertFilter?.shardId) {
      return alertInstance;
    }
    const shardIdInt = parseInt(alertFilter.shardId!, 10);
    const alertStates = alertInstanceStates.filter(
      ({ meta }) => (meta as CCRReadExceptionsStats).shardId === shardIdInt
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
    const CCRReadExceptionsMeta = alertStates[0].meta as CCRReadExceptionsUIMeta;
    const { remoteCluster, followerIndex } = CCRReadExceptionsMeta;

    const shortActionText = i18n.translate(
      'xpack.monitoring.alerts.ccrReadExceptions.shortAction',
      {
        defaultMessage:
          'Verify follower and leader index relationships on the affected remote cluster.',
      }
    );
    const fullActionText = i18n.translate('xpack.monitoring.alerts.ccrReadExceptions.fullAction', {
      defaultMessage: 'View CCR stats',
    });

    const ccs = alertStates.find((state) => state.ccs)?.ccs;
    const globalStateLink = this.createGlobalStateLink(
      'elasticsearch/ccr',
      cluster.clusterUuid,
      ccs
    );

    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.ccrReadExceptions.firing.internalShortMessage',
      {
        defaultMessage: `CCR read exceptions alert is firing for the following remote cluster: {remoteCluster}. {shortActionText}`,
        values: {
          remoteCluster,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.ccrReadExceptions.firing.internalFullMessage',
      {
        defaultMessage: `CCR read exceptions alert is firing for the following remote cluster: {remoteCluster}. Current 'follower_index' index affected: {followerIndex}. {action}`,
        values: {
          action,
          remoteCluster,
          followerIndex,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      remoteCluster,
      followerIndex,
      /* continue to send "remoteClusters" and "followerIndices" values for users still using it though
        we have replaced it with "remoteCluster" and "followerIndex" in the template due to alerts per index instead of all indices
        see https://github.com/elastic/kibana/issues/100136#issuecomment-865229431
        */
      remoteClusters: remoteCluster,
      followerIndices: followerIndex,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
