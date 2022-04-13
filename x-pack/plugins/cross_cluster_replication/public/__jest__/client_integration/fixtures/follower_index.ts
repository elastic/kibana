/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Chance from 'chance';
import { getRandomString } from '@kbn/test-jest-helpers';
import { FollowerIndex } from '../../../../common/types';

const chance = new Chance();

interface FollowerIndexMock {
  name: string;
  remoteCluster: string;
  leaderIndex: string;
  status: string;
}

export const getFollowerIndexMock = ({
  name = getRandomString(),
  remoteCluster = getRandomString(),
  leaderIndex = getRandomString(),
  status = 'Active',
}: FollowerIndexMock): FollowerIndex => ({
  name,
  remoteCluster,
  leaderIndex,
  status,
  maxReadRequestOperationCount: chance.integer(),
  maxOutstandingReadRequests: chance.integer(),
  maxReadRequestSize: getRandomString({ length: 5 }),
  maxWriteRequestOperationCount: chance.integer(),
  maxWriteRequestSize: '9223372036854775807b',
  maxOutstandingWriteRequests: chance.integer(),
  maxWriteBufferCount: chance.integer(),
  maxWriteBufferSize: getRandomString({ length: 5 }),
  maxRetryDelay: getRandomString({ length: 5 }),
  readPollTimeout: getRandomString({ length: 5 }),
  shards: [
    {
      id: 0,
      remoteCluster,
      leaderIndex,
      leaderGlobalCheckpoint: chance.integer(),
      leaderMaxSequenceNum: chance.integer(),
      followerGlobalCheckpoint: chance.integer(),
      followerMaxSequenceNum: chance.integer(),
      lastRequestedSequenceNum: chance.integer(),
      outstandingReadRequestsCount: chance.integer(),
      outstandingWriteRequestsCount: chance.integer(),
      writeBufferOperationsCount: chance.integer(),
      writeBufferSizeBytes: chance.integer(),
      followerMappingVersion: chance.integer(),
      followerSettingsVersion: chance.integer(),
      totalReadTimeMs: chance.integer(),
      totalReadRemoteExecTimeMs: chance.integer(),
      successfulReadRequestCount: chance.integer(),
      failedReadRequestsCount: chance.integer(),
      operationsReadCount: chance.integer(),
      bytesReadCount: chance.integer(),
      totalWriteTimeMs: chance.integer(),
      successfulWriteRequestsCount: chance.integer(),
      failedWriteRequestsCount: chance.integer(),
      operationsWrittenCount: chance.integer(),
      readExceptions: [],
      timeSinceLastReadMs: chance.integer(),
    },
  ],
});
