/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ShardFromEs, FollowerIndexFromEs, FollowerIndex } from '../types';

import {
  deserializeShard,
  deserializeFollowerIndex,
  deserializeListFollowerIndices,
  serializeFollowerIndex,
} from './follower_index_serialization';

describe('[CCR] follower index serialization', () => {
  describe('deserializeShard()', () => {
    it('deserializes shard', () => {
      const serializedShard = {
        remote_cluster: 'remote cluster',
        leader_index: 'leader index',
        shard_id: 1,
        leader_global_checkpoint: 1,
        leader_max_seq_no: 1,
        follower_global_checkpoint: 1,
        follower_max_seq_no: 1,
        last_requested_seq_no: 1,
        outstanding_read_requests: 1,
        outstanding_write_requests: 1,
        write_buffer_operation_count: 1,
        write_buffer_size_in_bytes: 1,
        follower_mapping_version: 1,
        follower_settings_version: 1,
        total_read_time_millis: 1,
        total_read_remote_exec_time_millis: 1,
        successful_read_requests: 1,
        failed_read_requests: 1,
        operations_read: 1,
        bytes_read: 1,
        total_write_time_millis: 1,
        successful_write_requests: 1,
        failed_write_requests: 1,
        operations_written: 1,
        read_exceptions: ['read exception'],
        time_since_last_read_millis: 1,
      };

      expect(deserializeShard(serializedShard as ShardFromEs)).toMatchSnapshot();
    });
  });

  describe('deserializeFollowerIndex()', () => {
    it('deserializes Elasticsearch follower index object', () => {
      const serializedFollowerIndex = {
        follower_index: 'follower index 1',
        remote_cluster: 'cluster 1',
        leader_index: 'leader 1',
        status: 'active',
        parameters: {
          max_read_request_operation_count: 1,
          max_outstanding_read_requests: 1,
          max_read_request_size: '1b',
          max_write_request_operation_count: 1,
          max_write_request_size: '1b',
          max_outstanding_write_requests: 1,
          max_write_buffer_count: 1,
          max_write_buffer_size: '1b',
          max_retry_delay: '1s',
          read_poll_timeout: '1s',
        },
        shards: [
          {
            remote_cluster: 'cluster 1',
            leader_index: 'leader 1',
            shard_id: 1,
            leader_global_checkpoint: 1,
            leader_max_seq_no: 1,
            follower_global_checkpoint: 1,
            follower_max_seq_no: 1,
            last_requested_seq_no: 1,
            outstanding_read_requests: 1,
            outstanding_write_requests: 1,
            write_buffer_operation_count: 1,
            write_buffer_size_in_bytes: 1,
            follower_mapping_version: 1,
            follower_settings_version: 1,
            total_read_time_millis: 1,
            total_read_remote_exec_time_millis: 1,
            successful_read_requests: 1,
            failed_read_requests: 1,
            operations_read: 1,
            bytes_read: 1,
            total_write_time_millis: 1,
            successful_write_requests: 1,
            failed_write_requests: 1,
            operations_written: 1,
            // This is an array of exception objects
            read_exceptions: [],
            time_since_last_read_millis: 1,
          },
          {
            remote_cluster: 'remote_cluster 2',
            leader_index: 'leader_index 2',
            shard_id: 'shard 2',
          },
        ],
      };

      expect(
        deserializeFollowerIndex(serializedFollowerIndex as FollowerIndexFromEs)
      ).toMatchSnapshot();
    });
  });

  describe('deserializeListFollowerIndices()', () => {
    it('deserializes list of Elasticsearch follower index objects', () => {
      const serializedFollowerIndexList = [
        {
          follower_index: 'follower index 1',
          remote_cluster: 'cluster 1',
          leader_index: 'leader 1',
          status: 'active',
          parameters: {
            max_read_request_operation_count: 1,
            max_outstanding_read_requests: 1,
            max_read_request_size: '1b',
            max_write_request_operation_count: 1,
            max_write_request_size: '1b',
            max_outstanding_write_requests: 1,
            max_write_buffer_count: 1,
            max_write_buffer_size: '1b',
            max_retry_delay: '1s',
            read_poll_timeout: '1s',
          },
          shards: [],
        },
        {
          follower_index: 'follower index 2',
          remote_cluster: 'cluster 2',
          leader_index: 'leader 2',
          status: 'paused',
          parameters: {
            max_read_request_operation_count: 2,
            max_outstanding_read_requests: 2,
            max_read_request_size: '2b',
            max_write_request_operation_count: 2,
            max_write_request_size: '2b',
            max_outstanding_write_requests: 2,
            max_write_buffer_count: 2,
            max_write_buffer_size: '2b',
            max_retry_delay: '2s',
            read_poll_timeout: '2s',
          },
          shards: [],
        },
      ];

      const deserializedFollowerIndexList = [
        {
          name: 'follower index 1',
          remoteCluster: 'cluster 1',
          leaderIndex: 'leader 1',
          status: 'active',
          maxReadRequestOperationCount: 1,
          maxOutstandingReadRequests: 1,
          maxReadRequestSize: '1b',
          maxWriteRequestOperationCount: 1,
          maxWriteRequestSize: '1b',
          maxOutstandingWriteRequests: 1,
          maxWriteBufferCount: 1,
          maxWriteBufferSize: '1b',
          maxRetryDelay: '1s',
          readPollTimeout: '1s',
          shards: [],
        },
        {
          name: 'follower index 2',
          remoteCluster: 'cluster 2',
          leaderIndex: 'leader 2',
          status: 'paused',
          maxReadRequestOperationCount: 2,
          maxOutstandingReadRequests: 2,
          maxReadRequestSize: '2b',
          maxWriteRequestOperationCount: 2,
          maxWriteRequestSize: '2b',
          maxOutstandingWriteRequests: 2,
          maxWriteBufferCount: 2,
          maxWriteBufferSize: '2b',
          maxRetryDelay: '2s',
          readPollTimeout: '2s',
          shards: [],
        },
      ];

      expect(deserializeListFollowerIndices(serializedFollowerIndexList)).toEqual(
        deserializedFollowerIndexList
      );
    });
  });

  describe('serializeFollowerIndex()', () => {
    it('serializes object to Elasticsearch follower index object', () => {
      const deserializedFollowerIndex = {
        name: 'test',
        status: 'active',
        shards: [],
        remoteCluster: 'remote cluster',
        leaderIndex: 'leader index',
        maxReadRequestOperationCount: 1,
        maxOutstandingReadRequests: 1,
        maxReadRequestSize: '1b',
        maxWriteRequestOperationCount: 1,
        maxWriteRequestSize: '1b',
        maxOutstandingWriteRequests: 1,
        maxWriteBufferCount: 1,
        maxWriteBufferSize: '1b',
        maxRetryDelay: '1s',
        readPollTimeout: '1s',
      };

      expect(serializeFollowerIndex(deserializedFollowerIndex as FollowerIndex)).toMatchSnapshot();
    });
  });
});
