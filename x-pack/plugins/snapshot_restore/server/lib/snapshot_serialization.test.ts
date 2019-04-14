/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeSnapshotDetails } from './snapshot_serialization';

describe('deserializeSnapshotDetails', () => {
  test('groups multiple failures by their index and sorts them by their shard', () => {
    expect(
      deserializeSnapshotDetails('repositoryName', {
        snapshot: 'snapshot name',
        uuid: 'UUID',
        version_id: 5,
        version: 'version',
        indices: ['index1'],
        include_global_state: false,
        state: 'SUCCESS',
        start_time: '0',
        start_time_in_millis: 0,
        end_time: '1',
        end_time_in_millis: 1,
        duration_in_millis: 1,
        shards: {
          total: 3,
          failed: 1,
          successful: 2,
        },
        failures: [
          {
            index: 'a',
            shard: 3,
          },
          {
            index: 'a',
            shard: 1,
          },
          {
            index: 'a',
            shard: 2,
          },
        ],
      })
    ).toEqual({
      repository: 'repositoryName',
      snapshot: 'snapshot name',
      uuid: 'UUID',
      versionId: 5,
      version: 'version',
      indices: ['index1'],
      includeGlobalState: 0,
      indexFailures: [
        {
          index: 'a',
          failures: [
            {
              shard: 1,
            },
            {
              shard: 2,
            },
            {
              shard: 3,
            },
          ],
        },
      ],
      state: 'SUCCESS',
      startTime: '0',
      startTimeInMillis: 0,
      endTime: '1',
      endTimeInMillis: 1,
      durationInMillis: 1,
      shards: {
        total: 3,
        failed: 1,
        successful: 2,
      },
    });
  });
});
