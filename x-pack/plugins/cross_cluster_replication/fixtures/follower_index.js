/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const Chance = require('chance'); // eslint-disable-line import/no-extraneous-dependencies
const chance = new Chance();

export const getFollowerIndexMock = (
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
) => {
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

  return {
    index: name,
    shards: shards.map(serializeShard),
  };
};

export const getFollowerIndexListMock = (total = 3) => {
  const list = {
    follow_stats: {
      indices: [],
    },
  };

  let i = total;
  while(i--) {
    list.follow_stats.indices.push(getFollowerIndexMock());
  }

  return list;
};
