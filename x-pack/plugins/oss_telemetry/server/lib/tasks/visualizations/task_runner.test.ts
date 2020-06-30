/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getMockCallWithInternal,
  getMockConfig,
  getMockEs,
  getMockTaskInstance,
} from '../../../test_utils';
import { visualizationsTaskRunner } from './task_runner';
import { TaskInstance } from '../../../../../task_manager/server';
import { getNextMidnight } from '../../get_next_midnight';
import moment from 'moment';

describe('visualizationsTaskRunner', () => {
  let mockTaskInstance: TaskInstance;
  beforeEach(() => {
    mockTaskInstance = getMockTaskInstance();
  });

  describe('Error handling', () => {
    test('catches its own errors', async () => {
      const mockCallWithInternal = () => Promise.reject(new Error('Things did not go well!'));

      const runner = visualizationsTaskRunner(
        mockTaskInstance,
        getMockConfig(),
        getMockEs(mockCallWithInternal)
      );
      const result = await runner();
      expect(result).toMatchObject({
        error: 'Things did not go well!',
        state: {
          runs: 1,
          stats: undefined,
        },
      });
    });
  });

  test('Summarizes visualization response data', async () => {
    const runner = visualizationsTaskRunner(mockTaskInstance, getMockConfig(), getMockEs());
    const result = await runner();

    expect(result).toMatchObject({
      error: undefined,
      runAt: getNextMidnight(),
      state: {
        runs: 1,
        stats: {
          shell_beads: {
            spaces_avg: 1,
            spaces_max: 1,
            spaces_min: 1,
            total: 1,
            saved_7_days_total: 1,
            saved_30_days_total: 1,
            saved_90_days_total: 1,
          },
        },
      },
    });
  });

  test('Summarizes visualization response data per Space', async () => {
    const mockCallWithInternal = getMockCallWithInternal([
      // default space
      {
        _id: 'visualization:coolviz-123',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "cave_painting"}' },
          updated_at: moment().subtract(7, 'days').startOf('day').toString(),
        },
      },
      {
        _id: 'visualization:coolviz-456',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "printing_press"}' },
          updated_at: moment().subtract(20, 'days').startOf('day').toString(),
        },
      },
      {
        _id: 'meat:visualization:coolviz-789',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "floppy_disk"}' },
          updated_at: moment().subtract(2, 'months').startOf('day').toString(),
        },
      },
      // meat space
      {
        _id: 'meat:visualization:coolviz-789',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "cave_painting"}' },
          updated_at: moment().subtract(89, 'days').startOf('day').toString(),
        },
      },
      {
        _id: 'meat:visualization:coolviz-789',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "cuneiform"}' },
          updated_at: moment().subtract(5, 'months').startOf('day').toString(),
        },
      },
      {
        _id: 'meat:visualization:coolviz-789',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "cuneiform"}' },
          updated_at: moment().subtract(2, 'days').startOf('day').toString(),
        },
      },
      {
        _id: 'meat:visualization:coolviz-789',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "floppy_disk"}' },
          updated_at: moment().subtract(7, 'days').startOf('day').toString(),
        },
      },
      // cyber space
      {
        _id: 'cyber:visualization:coolviz-789',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "floppy_disk"}' },
          updated_at: moment().subtract(7, 'months').startOf('day').toString(),
        },
      },
      {
        _id: 'cyber:visualization:coolviz-789',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "floppy_disk"}' },
          updated_at: moment().subtract(3, 'days').startOf('day').toString(),
        },
      },
      {
        _id: 'cyber:visualization:coolviz-123',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "cave_painting"}' },
          updated_at: moment().subtract(15, 'days').startOf('day').toString(),
        },
      },
    ]);

    const expectedStats = {
      cave_painting: {
        total: 3,
        spaces_min: 1,
        spaces_max: 1,
        spaces_avg: 1,
        saved_7_days_total: 1,
        saved_30_days_total: 2,
        saved_90_days_total: 3,
      },
      printing_press: {
        total: 1,
        spaces_min: 1,
        spaces_max: 1,
        spaces_avg: 1,
        saved_7_days_total: 0,
        saved_30_days_total: 1,
        saved_90_days_total: 1,
      },
      cuneiform: {
        total: 2,
        spaces_min: 2,
        spaces_max: 2,
        spaces_avg: 2,
        saved_7_days_total: 1,
        saved_30_days_total: 1,
        saved_90_days_total: 1,
      },
      floppy_disk: {
        total: 4,
        spaces_min: 2,
        spaces_max: 2,
        spaces_avg: 2,
        saved_7_days_total: 2,
        saved_30_days_total: 2,
        saved_90_days_total: 3,
      },
    };

    const runner = visualizationsTaskRunner(
      mockTaskInstance,
      getMockConfig(),
      getMockEs(mockCallWithInternal)
    );
    const result = await runner();

    expect(result).toMatchObject({
      error: undefined,
      state: {
        runs: 1,
        stats: expectedStats,
      },
    });

    expect(result.state.stats).toMatchObject(expectedStats);
  });
});
