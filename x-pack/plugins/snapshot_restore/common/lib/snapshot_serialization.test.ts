/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeSnapshotDetails, serializeSnapshotConfig } from './snapshot_serialization';

describe('Snapshot serialization and deserialization', () => {
  describe('deserializeSnapshotDetails', () => {
    test('deserializes a snapshot', () => {
      expect(
        deserializeSnapshotDetails(
          {
            snapshot: 'snapshot name',
            uuid: 'UUID',
            repository: 'repositoryName',
            version_id: 5,
            version: 'version',
            indices: ['index2', 'index3', 'index1', '.kibana'],
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
            feature_states: [
              {
                feature_name: 'kibana',
                indices: ['.kibana'],
              },
            ],
            failures: [
              {
                index: 'z',
                shard: 1,
              },
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
          },
          'found-snapshots',
          [
            {
              snapshot: 'last_successful_snapshot',
              uuid: 'last_successful_snapshot_UUID',
              repository: 'repositoryName',
              version_id: 5,
              version: 'version',
              indices: ['index2', 'index3', 'index1'],
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
              feature_states: [
                {
                  feature_name: 'kibana',
                  indices: ['.kibana'],
                },
              ],
              failures: [
                {
                  index: 'z',
                  shard: 1,
                },
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
            },
          ]
        )
      ).toEqual({
        repository: 'repositoryName',
        snapshot: 'snapshot name',
        uuid: 'UUID',
        versionId: 5,
        version: 'version',
        // Indices are sorted and dont include any of the system indices listed in feature_state
        indices: ['index1', 'index2', 'index3'],
        dataStreams: [],
        includeGlobalState: false,
        // Failures are grouped and sorted by index, and the failures themselves are sorted by shard.
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
          {
            index: 'z',
            failures: [
              {
                shard: 1,
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
        managedRepository: 'found-snapshots',
        isLastSuccessfulSnapshot: false,
      });
    });
  });

  describe('serializeSnapshotConfig', () => {
    test('serializes config as expected', () => {
      const metadata = { test: 'what have you' };
      expect(serializeSnapshotConfig({ metadata, indices: '.k*' })).toEqual({
        metadata,
        indices: ['.k*'],
      });
    });
    test('serializes empty config as expected', () => {
      expect(serializeSnapshotConfig({})).toEqual({});
    });
  });
});
