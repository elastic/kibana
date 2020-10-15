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
  followIndexPattern: 'prefix_{{leader_index}}_suffix',
};

export const FOLLOWER_INDEX_EDIT_NAME = 'my-follower-index';

export const FOLLOWER_INDEX_EDIT = {
  name: FOLLOWER_INDEX_EDIT_NAME,
  remoteCluster: 'new-york',
  leaderIndex: 'some-leader-test',
  status: 'active',
  maxReadRequestOperationCount: 7845,
  maxOutstandingReadRequests: 16,
  maxReadRequestSize: '64mb',
  maxWriteRequestOperationCount: 2456,
  maxWriteRequestSize: '1048b',
  maxOutstandingWriteRequests: 69,
  maxWriteBufferCount: 123456,
  maxWriteBufferSize: '256mb',
  maxRetryDelay: '225ms',
  readPollTimeout: '2m',
};
