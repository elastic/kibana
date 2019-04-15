/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export const AUTO_FOLLOW_PATTERN_EDIT_NAME = 'my-autofollow';

export const AUTO_FOLLOW_PATTERN_EDIT = {
  name: AUTO_FOLLOW_PATTERN_EDIT_NAME,
  remoteCluster: 'cluster-2',
  leaderIndexPatterns: ['my-pattern-*'],
  followIndexPattern: 'prefix_{{leader_index}}_suffix'
};
