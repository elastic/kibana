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
      snapshot: undefined,
      uuid: undefined,
      versionId: undefined,
      version: undefined,
      indices: undefined,
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
      state: undefined,
      startTime: undefined,
      startTimeInMillis: undefined,
      endTime: undefined,
      endTimeInMillis: undefined,
      durationInMillis: undefined,
      shards: undefined,
    });
  });
});
