/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const deserializeAutofollowPattern = (
  name,
  { remote_cluster, leader_index_patterns, follow_index_pattern } = {} // eslint-disable-line camelcase
) => {
  if (!name) {
    return {};
  }

  return {
    name,
    remoteCluster: remote_cluster,
    leaderIndexPatterns: leader_index_patterns,
    followIndexPattern: follow_index_pattern,
  };
};

export const deserializeListAutofollowPatterns = autofollowPatterns =>
  Object.entries(autofollowPatterns).reduce(
    (deSerialized, [name, autofollowPattern]) => ({
      ...deSerialized,
      [name]: deserializeAutofollowPattern(name, autofollowPattern),
    }),
    {}
  );

export const serializeAutofolloPattern = ({
  remoteCluster,
  leaderIndexPatterns,
  followIndexPattern,
}) => ({
  remote_cluster: remoteCluster,
  leader_index_patterns: leaderIndexPatterns,
  follow_index_pattern: followIndexPattern,
});

