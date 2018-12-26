/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable camelcase */
export const deserializeAutoFollowStats = ({
  number_of_failed_follow_indices,
  number_of_failed_remote_cluster_state_requests,
  number_of_successful_follow_indices,
  recent_auto_follow_errors,
  auto_followed_clusters
}) => ({
  numberOfFailedFollowIndices: number_of_failed_follow_indices,
  numberOfFailedRemoteClusterStateRequests: number_of_failed_remote_cluster_state_requests,
  numberOfSuccessfulFollowIndices: number_of_successful_follow_indices,
  recentAutoFollowErrors: recent_auto_follow_errors,
  autoFollowedClusters: auto_followed_clusters,
});
/* eslint-enable camelcase */
