/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AutoFollowPattern, AutoFollowPatternFromEs, AutoFollowPatternToEs } from '../types';

export const deserializeAutoFollowPattern = (
  autoFollowPattern: AutoFollowPatternFromEs
): AutoFollowPattern => {
  const {
    name,
    pattern: { active, remote_cluster, leader_index_patterns, follow_index_pattern },
  } = autoFollowPattern;

  return {
    name,
    active,
    remoteCluster: remote_cluster,
    leaderIndexPatterns: leader_index_patterns,
    followIndexPattern: follow_index_pattern,
  };
};

export const deserializeListAutoFollowPatterns = (
  autoFollowPatterns: AutoFollowPatternFromEs[]
): AutoFollowPattern[] => autoFollowPatterns.map(deserializeAutoFollowPattern);

export const serializeAutoFollowPattern = ({
  remoteCluster,
  leaderIndexPatterns,
  followIndexPattern,
}: AutoFollowPattern): AutoFollowPatternToEs => ({
  remote_cluster: remoteCluster,
  leader_index_patterns: leaderIndexPatterns,
  follow_index_pattern: followIndexPattern,
});
