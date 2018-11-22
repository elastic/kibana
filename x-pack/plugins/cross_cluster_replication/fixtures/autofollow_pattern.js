/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const Chance = require('chance'); // eslint-disable-line
const chance = new Chance();

export const getAutoFollowPatternMock = (
  remoteCluster = chance.string(),
  leaderIndexPatterns = [chance.string()],
  followIndexPattern = chance.string()) => ({
  remote_cluster: remoteCluster,
  leader_index_patterns: leaderIndexPatterns,
  follow_index_pattern: followIndexPattern
});

export const getAutoFollowPatternListMock = (total = 3) => {
  const list = {};

  let i = total;
  while(i--) {
    list[chance.string()] = getAutoFollowPatternMock();
  }

  return list;
};
