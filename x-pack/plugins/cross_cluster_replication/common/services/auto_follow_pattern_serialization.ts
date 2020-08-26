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
    pattern: {
      active,
      remote_cluster: remoteCluster,
      leader_index_patterns: leaderIndexPatterns,
      follow_index_pattern: followIndexPattern,
    },
  } = autoFollowPattern;

  return {
    name,
    active,
    remoteCluster,
    leaderIndexPatterns,
    followIndexPattern,
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
