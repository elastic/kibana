/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RecentAutoFollowError,
  RecentAutoFollowErrorFromEs,
  AutoFollowedCluster,
  AutoFollowedClusterFromEs,
  AutoFollowStats,
  AutoFollowStatsFromEs,
} from '../../common/types';
/* eslint-disable @typescript-eslint/naming-convention */
export const deserializeRecentAutoFollowErrors = ({
  timestamp,
  leader_index,
  auto_follow_exception: { type, reason },
}: RecentAutoFollowErrorFromEs): RecentAutoFollowError => ({
  timestamp,
  leaderIndex: leader_index,
  autoFollowException: {
    type,
    reason,
  },
});

export const deserializeAutoFollowedClusters = ({
  cluster_name,
  time_since_last_check_millis,
  last_seen_metadata_version,
}: AutoFollowedClusterFromEs): AutoFollowedCluster => ({
  clusterName: cluster_name,
  timeSinceLastCheckMillis: time_since_last_check_millis,
  lastSeenMetadataVersion: last_seen_metadata_version,
});

export const deserializeAutoFollowStats = ({
  number_of_failed_follow_indices,
  number_of_failed_remote_cluster_state_requests,
  number_of_successful_follow_indices,
  recent_auto_follow_errors,
  auto_followed_clusters,
}: AutoFollowStatsFromEs): AutoFollowStats => ({
  numberOfFailedFollowIndices: number_of_failed_follow_indices,
  numberOfFailedRemoteClusterStateRequests: number_of_failed_remote_cluster_state_requests,
  numberOfSuccessfulFollowIndices: number_of_successful_follow_indices,
  recentAutoFollowErrors: recent_auto_follow_errors.map(deserializeRecentAutoFollowErrors),
  autoFollowedClusters: auto_followed_clusters.map(deserializeAutoFollowedClusters),
});
