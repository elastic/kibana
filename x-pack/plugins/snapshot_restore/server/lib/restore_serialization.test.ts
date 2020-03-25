/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deserializeRestoreShard } from './restore_serialization';
import { SnapshotRestoreShardEs } from '../../common/types';

describe('restore_serialization', () => {
  describe('deserializeRestoreShard()', () => {
    it('should deserialize a snapshot restore shard', () => {
      expect(
        deserializeRestoreShard({
          id: 0,
          type: 'SNAPSHOT',
          stage: 'DONE',
          primary: true,
          start_time: '2019-06-24T20:40:10.583Z',
          start_time_in_millis: 1561408810583,
          stop_time: '2019-06-24T20:40:11.324Z',
          stop_time_in_millis: 1561408811324,
          total_time: '740ms',
          total_time_in_millis: 740,
          source: {
            repository: 'my-backups',
            snapshot: 'snapshot_1',
            version: '8.0.0',
            index: 'test_index',
            restoreUUID: 'some_uuid',
          },
          target: {
            id: 'some_node_id',
            host: '127.0.0.1',
            transport_address: '127.0.0.1:9300',
            ip: '127.0.0.1',
            name: 'some_node_name',
          },
          index: {
            size: {
              total: '4.7mb',
              total_in_bytes: 4986706,
              reused: '0b',
              reused_in_bytes: 0,
              recovered: '4.7mb',
              recovered_in_bytes: 4986706,
              percent: '100.0%',
            },
            files: {
              total: 10,
              reused: 0,
              recovered: 10,
              percent: '100.0%',
            },
            total_time: '624ms',
            total_time_in_millis: 624,
            source_throttle_time: '-1',
            source_throttle_time_in_millis: 0,
            target_throttle_time: '-1',
            target_throttle_time_in_millis: 0,
          },
          translog: {
            recovered: 0,
            total: 0,
            percent: '100.0%',
            total_on_start: 0,
            total_time: '87ms',
            total_time_in_millis: 87,
          },
          verify_index: {
            check_index_time: '0s',
            check_index_time_in_millis: 0,
            total_time: '0s',
            total_time_in_millis: 0,
          },
        })
      ).toEqual({
        bytesPercent: '100.0%',
        bytesRecovered: 4986706,
        bytesTotal: 4986706,
        filesPercent: '100.0%',
        filesRecovered: 10,
        filesTotal: 10,
        id: 0,
        primary: true,
        repository: 'my-backups',
        snapshot: 'snapshot_1',
        stage: 'DONE',
        startTime: '2019-06-24T20:40:10.583Z',
        startTimeInMillis: 1561408810583,
        stopTime: '2019-06-24T20:40:11.324Z',
        stopTimeInMillis: 1561408811324,
        targetHost: '127.0.0.1',
        targetNode: 'some_node_name',
        totalTime: '740ms',
        totalTimeInMillis: 740,
        version: '8.0.0',
      });
    });

    it('should remove undefined properties', () => {
      expect(
        deserializeRestoreShard({
          type: 'SNAPSHOT',
          source: {},
          target: {},
          index: { size: {}, files: {} },
        } as SnapshotRestoreShardEs)
      ).toEqual({});
    });
  });
});
