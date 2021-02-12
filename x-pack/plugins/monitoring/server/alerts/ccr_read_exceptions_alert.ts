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
  CCRReadExceptionsUIMeta,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  CommonAlertFilter,
  CCRReadExceptionsStats,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_CCR_READ_EXCEPTIONS,
  ALERT_DETAILS,
} from '../../common/constants';
import { fetchCCRReadExceptions } from '../lib/alerts/fetch_ccr_read_exceptions';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { parseDuration } from '../../../alerts/common/parse_duration';
import { SanitizedAlert, RawAlertInstance } from '../../../alerts/common';
import { AlertingDefaults, createLink } from './alert_helpers';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { Globals } from '../static_globals';

export class CCRReadExceptionsAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_CCR_READ_EXCEPTIONS,
      name: ALERT_DETAILS[ALERT_CCR_READ_EXCEPTIONS].label,
      throttle: '6h',
      defaultParams: {
        duration: '1h',
      },
      actionVariables: [
        {
          name: 'remoteClusters',
          description: i18n.translate(
            'xpack.monitoring.alerts.ccrReadExceptions.actionVariables.remoteClusters',
            {
              defaultMessage: 'List of remote clusters that are experiencing CCR read exceptions.',
            }
          ),
        },
        {
          name: 'followerIndices',
          description: i18n.translate(
            'xpack.monitoring.alerts.ccrReadExceptions.actionVariables.followerIndices',
            {
              defaultMessage: 'List of follower indices reporting CCR read exceptions.',
            }
          ),
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
    const { duration: durationString } = params;
    const duration = parseDuration(durationString);
    const endMs = +new Date();
    const startMs = endMs - duration;
    const stats = await fetchCCRReadExceptions(
      callCluster,
      esIndexPattern,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size
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
    const {
      remoteCluster,
      followerIndex,
      shardId,
      lastReadException,
    } = item.meta as CCRReadExceptionsUIMeta;
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
    instance: AlertInstance,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    const remoteClustersList = alertStates
      .map((alertState) => (alertState.meta as CCRReadExceptionsUIMeta).remoteCluster)
      .join(', ');
    const followerIndicesList = alertStates
      .map((alertState) => (alertState.meta as CCRReadExceptionsUIMeta).followerIndex)
      .join(', ');

    const shortActionText = i18n.translate(
      'xpack.monitoring.alerts.ccrReadExceptions.shortAction',
      {
        defaultMessage:
          'Verify follower and leader index relationships across the affected remote clusters.',
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
        defaultMessage: `CCR read exceptions alert is firing for the following remote clusters: {remoteClustersList}. {shortActionText}`,
        values: {
          remoteClustersList,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.ccrReadExceptions.firing.internalFullMessage',
      {
        defaultMessage: `CCR read exceptions alert is firing for the following remote clusters: {remoteClustersList}. Current 'follower_index' indices are affected: {followerIndicesList}. {action}`,
        values: {
          action,
          remoteClustersList,
          followerIndicesList,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      remoteClusters: remoteClustersList,
      followerIndices: followerIndicesList,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
