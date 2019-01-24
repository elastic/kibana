/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const Chance = require('chance'); // eslint-disable-line import/no-extraneous-dependencies
const chance = new Chance();

export const getAutoFollowPatternMock = (
  name = chance.string(),
  remoteCluster = chance.string(),
  leaderIndexPatterns = [chance.string()],
  followIndexPattern = chance.string()
) => ({
  name,
  pattern: {
    remote_cluster: remoteCluster,
    leader_index_patterns: leaderIndexPatterns,
    follow_index_pattern: followIndexPattern
  }
});

export const getAutoFollowPatternListMock = (total = 3) => {
  const list = {
    patterns: []
  };

  let i = total;
  while(i--) {
    list.patterns.push(getAutoFollowPatternMock());
  }

  return list;
};
