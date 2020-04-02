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

/* eslint-disable camelcase */
export const deserializeFollowerIndex = ({
  follower_index,
  remote_cluster,
  leader_index,
  status,
  parameters: {
    max_read_request_operation_count,
    max_outstanding_read_requests,
    max_read_request_size,
    max_write_request_operation_count,
    max_write_request_size,
    max_outstanding_write_requests,
    max_write_buffer_count,
    max_write_buffer_size,
    max_retry_delay,
    read_poll_timeout,
  } = {},
  shards,
}) => ({
  name: follower_index,
  remoteCluster: remote_cluster,
  leaderIndex: leader_index,
  status,
  maxReadRequestOperationCount: max_read_request_operation_count,
  maxOutstandingReadRequests: max_outstanding_read_requests,
  maxReadRequestSize: max_read_request_size,
  maxWriteRequestOperationCount: max_write_request_operation_count,
  maxWriteRequestSize: max_write_request_size,
  maxOutstandingWriteRequests: max_outstanding_write_requests,
  maxWriteBufferCount: max_write_buffer_count,
  maxWriteBufferSize: max_write_buffer_size,
  maxRetryDelay: max_retry_delay,
  readPollTimeout: read_poll_timeout,
  shards: shards && shards.map(deserializeShard),
});
/* eslint-enable camelcase */

export const deserializeListFollowerIndices = followerIndices =>
  followerIndices.map(deserializeFollowerIndex);

export const serializeAdvancedSettings = ({
  maxReadRequestOperationCount,
  maxOutstandingReadRequests,
  maxReadRequestSize,
  maxWriteRequestOperationCount,
  maxWriteRequestSize,
  maxOutstandingWriteRequests,
  maxWriteBufferCount,
  maxWriteBufferSize,
  maxRetryDelay,
  readPollTimeout,
}) => ({
  max_read_request_operation_count: maxReadRequestOperationCount,
  max_outstanding_read_requests: maxOutstandingReadRequests,
  max_read_request_size: maxReadRequestSize,
  max_write_request_operation_count: maxWriteRequestOperationCount,
  max_write_request_size: maxWriteRequestSize,
  max_outstanding_write_requests: maxOutstandingWriteRequests,
  max_write_buffer_count: maxWriteBufferCount,
  max_write_buffer_size: maxWriteBufferSize,
  max_retry_delay: maxRetryDelay,
  read_poll_timeout: readPollTimeout,
});

export const serializeFollowerIndex = followerIndex => ({
  remote_cluster: followerIndex.remoteCluster,
  leader_index: followerIndex.leaderIndex,
  ...serializeAdvancedSettings(followerIndex),
});
