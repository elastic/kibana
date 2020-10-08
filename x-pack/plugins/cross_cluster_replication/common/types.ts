/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AutoFollowPattern {
  name: string;
  active: boolean;
  remoteCluster: string;
  leaderIndexPatterns: string[];
  followIndexPattern: string;
}

export interface AutoFollowPatternFromEs {
  name: string;
  pattern: {
    active: boolean;
    remote_cluster: string;
    leader_index_patterns: string[];
    follow_index_pattern: string;
  };
}

export interface AutoFollowPatternToEs {
  remote_cluster: string;
  leader_index_patterns: string[];
  follow_index_pattern: string;
}

export interface ShardFromEs {
  remote_cluster: string;
  leader_index: string;
  shard_id: number;
  leader_global_checkpoint: number;
  leader_max_seq_no: number;
  follower_global_checkpoint: number;
  follower_max_seq_no: number;
  last_requested_seq_no: number;
  outstanding_read_requests: number;
  outstanding_write_requests: number;
  write_buffer_operation_count: number;
  write_buffer_size_in_bytes: number;
  follower_mapping_version: number;
  follower_settings_version: number;
  total_read_time_millis: number;
  total_read_remote_exec_time_millis: number;
  successful_read_requests: number;
  failed_read_requests: number;
  operations_read: number;
  bytes_read: number;
  total_write_time_millis: number;
  successful_write_requests: number;
  failed_write_requests: number;
  operations_written: number;
  // This is an array of exception objects
  read_exceptions: any[];
  time_since_last_read_millis: number;
}

export interface Shard {
  remoteCluster: string;
  leaderIndex: string;
  id: number;
  leaderGlobalCheckpoint: number;
  leaderMaxSequenceNum: number;
  followerGlobalCheckpoint: number;
  followerMaxSequenceNum: number;
  lastRequestedSequenceNum: number;
  outstandingReadRequestsCount: number;
  outstandingWriteRequestsCount: number;
  writeBufferOperationsCount: number;
  writeBufferSizeBytes: number;
  followerMappingVersion: number;
  followerSettingsVersion: number;
  totalReadTimeMs: number;
  totalReadRemoteExecTimeMs: number;
  successfulReadRequestCount: number;
  failedReadRequestsCount: number;
  operationsReadCount: number;
  bytesReadCount: number;
  totalWriteTimeMs: number;
  successfulWriteRequestsCount: number;
  failedWriteRequestsCount: number;
  operationsWrittenCount: number;
  // This is an array of exception objects
  readExceptions: any[];
  timeSinceLastReadMs: number;
}

export interface FollowerIndexFromEs {
  follower_index: string;
  remote_cluster: string;
  leader_index: string;
  status: string;
  // Once https://github.com/elastic/elasticsearch/issues/54996 is resolved so that paused follower
  // indices contain this information, we can removed this optional typing as well as the optional
  // typing in FollowerIndexAdvancedSettings and FollowerIndexAdvancedSettingsToEs.
  parameters?: FollowerIndexAdvancedSettingsToEs;
  shards: ShardFromEs[];
}

export interface FollowerIndex extends FollowerIndexAdvancedSettings {
  name: string;
  remoteCluster: string;
  leaderIndex: string;
  status: string;
  shards: Shard[];
}

export interface FollowerIndexToEs extends FollowerIndexAdvancedSettingsToEs {
  remote_cluster: string;
  leader_index: string;
}

export interface FollowerIndexAdvancedSettings {
  maxReadRequestOperationCount?: number;
  maxOutstandingReadRequests?: number;
  maxReadRequestSize?: string; // byte value
  maxWriteRequestOperationCount?: number;
  maxWriteRequestSize?: string; // byte value
  maxOutstandingWriteRequests?: number;
  maxWriteBufferCount?: number;
  maxWriteBufferSize?: string; // byte value
  maxRetryDelay?: string; // time value
  readPollTimeout?: string; // time value
}

export interface FollowerIndexAdvancedSettingsToEs {
  max_read_request_operation_count?: number;
  max_outstanding_read_requests?: number;
  max_read_request_size?: string; // byte value
  max_write_request_operation_count?: number;
  max_write_request_size?: string; // byte value
  max_outstanding_write_requests?: number;
  max_write_buffer_count?: number;
  max_write_buffer_size?: string; // byte value
  max_retry_delay?: string; // time value
  read_poll_timeout?: string; // time value
}

export interface RecentAutoFollowError {
  timestamp: number;
  leaderIndex: string;
  autoFollowException: {
    type: string;
    reason: string;
  };
}

export interface RecentAutoFollowErrorFromEs {
  timestamp: number;
  leader_index: string;
  auto_follow_exception: {
    type: string;
    reason: string;
  };
}

export interface AutoFollowedCluster {
  clusterName: string;
  timeSinceLastCheckMillis: number;
  lastSeenMetadataVersion: number;
}

export interface AutoFollowedClusterFromEs {
  cluster_name: string;
  time_since_last_check_millis: number;
  last_seen_metadata_version: number;
}

export interface AutoFollowStats {
  numberOfFailedFollowIndices: number;
  numberOfFailedRemoteClusterStateRequests: number;
  numberOfSuccessfulFollowIndices: number;
  recentAutoFollowErrors: RecentAutoFollowError[];
  autoFollowedClusters: AutoFollowedCluster[];
}

export interface AutoFollowStatsFromEs {
  number_of_failed_follow_indices: number;
  number_of_failed_remote_cluster_state_requests: number;
  number_of_successful_follow_indices: number;
  recent_auto_follow_errors: RecentAutoFollowErrorFromEs[];
  auto_followed_clusters: AutoFollowedClusterFromEs[];
}
