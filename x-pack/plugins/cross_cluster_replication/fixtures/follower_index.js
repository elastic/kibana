/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const Chance = require('chance'); // eslint-disable-line import/no-extraneous-dependencies
const chance = new Chance();
import { getRandomString } from '../../../test_utils';

const serializeShard = ({
  id,
  remoteCluster,
  leaderIndex,
  leaderGlobalCheckpoint,
  leaderMaxSequenceNum,
  followerGlobalCheckpoint,
  followerMaxSequenceNum,
  lastRequestedSequenceNum,
  outstandingReadRequestsCount,
  outstandingWriteRequestsCount,
  writeBufferOperationsCount,
  writeBufferSizeBytes,
  followerMappingVersion,
  followerSettingsVersion,
  totalReadTimeMs,
  totalReadRemoteExecTimeMs,
  successfulReadRequestCount,
  failedReadRequestsCount,
  operationsReadCount,
  bytesReadCount,
  totalWriteTimeMs,
  successfulWriteRequestsCount,
  failedWriteRequestsCount,
  operationsWrittenCount,
  readExceptions,
  timeSinceLastReadMs,
}) => ({
  shard_id: id,
  remote_cluster: remoteCluster,
  leader_index: leaderIndex,
  leader_global_checkpoint: leaderGlobalCheckpoint,
  leader_max_seq_no: leaderMaxSequenceNum,
  follower_global_checkpoint: followerGlobalCheckpoint,
  follower_max_seq_no: followerMaxSequenceNum,
  last_requested_seq_no: lastRequestedSequenceNum,
  outstanding_read_requests: outstandingReadRequestsCount,
  outstanding_write_requests: outstandingWriteRequestsCount,
  write_buffer_operation_count: writeBufferOperationsCount,
  write_buffer_size_in_bytes: writeBufferSizeBytes,
  follower_mapping_version: followerMappingVersion,
  follower_settings_version: followerSettingsVersion,
  total_read_time_millis: totalReadTimeMs,
  total_read_remote_exec_time_millis: totalReadRemoteExecTimeMs,
  successful_read_requests: successfulReadRequestCount,
  failed_read_requests: failedReadRequestsCount,
  operations_read: operationsReadCount,
  bytes_read: bytesReadCount,
  total_write_time_millis: totalWriteTimeMs,
  successful_write_requests: successfulWriteRequestsCount,
  failed_write_requests: failedWriteRequestsCount,
  operations_written: operationsWrittenCount,
  read_exceptions: readExceptions,
  time_since_last_read_millis: timeSinceLastReadMs,
});

export const getFollowerIndexStatsMock = (
  name = chance.string(),
  shards = [{
    id: chance.string(),
    remoteCluster: chance.string(),
    leaderIndex: chance.string(),
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
    readExceptions: [ chance.string() ],
    timeSinceLastReadMs: chance.integer(),
  }]
) => ({
  index: name,
  shards: shards.map(serializeShard),
});

export const getFollowerIndexListStatsMock = (total = 3, names) => {
  const list = {
    follow_stats: {
      indices: [],
    },
  };

  for(let i = 0; i < total; i++) {
    list.follow_stats.indices.push(getFollowerIndexStatsMock(names[i]));
  }

  return list;
};

export const getFollowerIndexInfoMock = (
  name = chance.string(),
  status = chance.string(),
  parameters = {
    maxReadRequestOperationCount: chance.string(),
    maxOutstandingReadRequests: chance.string(),
    maxReadRequestSize: chance.string(),
    maxWriteRequestOperationCount: chance.string(),
    maxWriteRequestSize: chance.string(),
    maxOutstandingWriteRequests: chance.string(),
    maxWriteBufferCount: chance.string(),
    maxWriteBufferSize: chance.string(),
    maxRetryDelay: chance.string(),
    readPollTimeout: chance.string(),
  }
) => {
  return {
    follower_index: name,
    status,
    max_read_request_operation_count: parameters.maxReadRequestOperationCount,
    max_outstanding_read_requests: parameters.maxOutstandingReadRequests,
    max_read_request_size: parameters.maxReadRequestSize,
    max_write_request_operation_count: parameters.maxWriteRequestOperationCount,
    max_write_request_size: parameters.maxWriteRequestSize,
    max_outstanding_write_requests: parameters.maxOutstandingWriteRequests,
    max_write_buffer_count: parameters.maxWriteBufferCount,
    max_write_buffer_size: parameters.maxWriteBufferSize,
    max_retry_delay: parameters.maxRetryDelay,
    read_poll_timeout: parameters.readPollTimeout,
  };
};

export const getFollowerIndexListInfoMock = (total = 3) => {
  const list = {
    follower_indices: [],
  };

  for(let i = 0; i < total; i++) {
    list.follower_indices.push(getFollowerIndexInfoMock());
  }

  return list;
};

// -----------------
// Client test mock
// -----------------

export const getFollowerIndexMock = ({
  name = getRandomString(),
  remoteCluster = getRandomString(),
  leaderIndex = getRandomString(),
  status = 'Active'
} = {}) => ({
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
  shards: [{
    id: 0,
    remoteCluster: remoteCluster,
    leaderIndex: leaderIndex,
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
  }]
});
