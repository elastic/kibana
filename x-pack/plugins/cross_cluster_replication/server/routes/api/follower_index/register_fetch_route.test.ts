/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';

import { isEsError } from '../../../shared_imports';
import { formatEsError } from '../../../lib/format_es_error';
import { License } from '../../../services';
import { mockRouteContext } from '../test_lib';
import { registerFetchRoute } from './register_fetch_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Fetch all follower indices', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerFetchRoute({
      router,
      license: {
        guardApiRoute: (route: any) => route,
      } as License,
      lib: {
        isEsError,
        formatEsError,
      },
    });

    routeHandler = router.get.mock.calls[0][1];
  });

  it('deserializes the response from Elasticsearch', async () => {
    const ccrInfoMockResponse = {
      follower_indices: [
        {
          follower_index: 'followerIndexName',
          remote_cluster: 'remoteCluster',
          leader_index: 'leaderIndex',
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
        },
      ],
    };

    // These stats correlate to the above follower indices.
    const ccrStatsMockResponse = {
      follow_stats: {
        indices: [
          {
            index: 'followerIndexName',
            shards: [
              {
                shard_id: 1,
                leader_index: 'leaderIndex',
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
                read_exceptions: 1,
                time_since_last_read_millis: 1,
              },
            ],
          },
        ],
      },
    };

    const routeContextMock = mockRouteContext({
      callAsCurrentUser: jest
        .fn()
        .mockResolvedValueOnce(ccrInfoMockResponse)
        .mockResolvedValueOnce(ccrStatsMockResponse),
    });

    const request = httpServerMock.createKibanaRequest();
    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);

    expect(response.payload.indices).toEqual([
      {
        name: 'followerIndexName',
        remoteCluster: 'remoteCluster',
        leaderIndex: 'leaderIndex',
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
        shards: [
          {
            id: 1,
            leaderIndex: 'leaderIndex',
            leaderGlobalCheckpoint: 1,
            leaderMaxSequenceNum: 1,
            followerGlobalCheckpoint: 1,
            followerMaxSequenceNum: 1,
            lastRequestedSequenceNum: 1,
            outstandingReadRequestsCount: 1,
            outstandingWriteRequestsCount: 1,
            writeBufferOperationsCount: 1,
            writeBufferSizeBytes: 1,
            followerMappingVersion: 1,
            followerSettingsVersion: 1,
            totalReadTimeMs: 1,
            totalReadRemoteExecTimeMs: 1,
            successfulReadRequestCount: 1,
            failedReadRequestsCount: 1,
            operationsReadCount: 1,
            bytesReadCount: 1,
            totalWriteTimeMs: 1,
            successfulWriteRequestsCount: 1,
            failedWriteRequestsCount: 1,
            operationsWrittenCount: 1,
            readExceptions: 1,
            timeSinceLastReadMs: 1,
          },
        ],
      },
    ]);
  });
});
