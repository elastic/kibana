/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable camelcase */
export const deserializeShard = ({
  remote_cluster,
  leader_index,
  shard_id,
  leader_global_checkpoint,
  leader_max_seq_no,
  follower_global_checkpoint,
  follower_max_seq_no,
  last_requested_seq_no,
  outstanding_read_requests,
  outstanding_write_requests,
  write_buffer_operation_count,
  write_buffer_size_in_bytes,
  follower_mapping_version,
  follower_settings_version,
  total_read_time_millis,
  total_read_remote_exec_time_millis,
  successful_read_requests,
  failed_read_requests,
  operations_read,
  bytes_read,
  total_write_time_millis,
  successful_write_requests,
  failed_write_requests,
  operations_written,
  read_exceptions,
  time_since_last_read_millis,
}) => ({
  id: shard_id,
  remoteCluster: remote_cluster,
  leaderIndex: leader_index,
  leaderGlobalCheckpoint: leader_global_checkpoint,
  leaderMaxSequenceNum: leader_max_seq_no,
  followerGlobalCheckpoint: follower_global_checkpoint,
  followerMaxSequenceNum: follower_max_seq_no,
  lastRequestedSequenceNum: last_requested_seq_no,
  outstandingReadRequestsCount: outstanding_read_requests,
  outstandingWriteRequestsCount: outstanding_write_requests,
  writeBufferOperationsCount: write_buffer_operation_count,
  writeBufferSizeBytes: write_buffer_size_in_bytes,
  followerMappingVersion: follower_mapping_version,
  followerSettingsVersion: follower_settings_version,
  totalReadTimeMs: total_read_time_millis,
  totalReadRemoteExecTimeMs: total_read_remote_exec_time_millis,
  successfulReadRequestCount: successful_read_requests,
  failedReadRequestsCount: failed_read_requests,
  operationsReadCount: operations_read,
  bytesReadCount: bytes_read,
  totalWriteTimeMs: total_write_time_millis,
  successfulWriteRequestsCount: successful_write_requests,
  failedWriteRequestsCount: failed_write_requests,
  operationsWrittenCount: operations_written,
  // This is an array of exception objects
  readExceptions: read_exceptions,
  timeSinceLastReadMs: time_since_last_read_millis,
});
/* eslint-enable camelcase */

export const deserializeFollowerIndex = ({ index, shards }) => ({
  name: index,
  shards: shards.map(deserializeShard),
});

export const deserializeListFollowerIndices = followerIndices =>
  followerIndices.map(deserializeFollowerIndex);

export const serializeFollowerIndex = ({ remoteCluster, leaderIndex }) => ({
  remote_cluster: remoteCluster,
  leader_index: leaderIndex,
});
