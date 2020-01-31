/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import {
  getMockCallWithInternal,
  getMockConfig,
  getMockEs,
  getMockTaskInstance,
} from '../../../../test_utils';
import { visualizationsTaskRunner } from './task_runner';
import { TaskInstance } from '../../../../../task_manager/server';

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
    const getNextMidnight = () =>
      moment()
        .add(1, 'days')
        .startOf('day')
        .toDate();

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
        },
      },
      {
        _id: 'visualization:coolviz-456',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "printing_press"}' },
        },
      },
      {
        _id: 'meat:visualization:coolviz-789',
        _source: { type: 'visualization', visualization: { visState: '{"type": "floppy_disk"}' } },
      },
      // meat space
      {
        _id: 'meat:visualization:coolviz-789',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "cave_painting"}' },
        },
      },
      {
        _id: 'meat:visualization:coolviz-789',
        _source: { type: 'visualization', visualization: { visState: '{"type": "cuneiform"}' } },
      },
      {
        _id: 'meat:visualization:coolviz-789',
        _source: { type: 'visualization', visualization: { visState: '{"type": "cuneiform"}' } },
      },
      {
        _id: 'meat:visualization:coolviz-789',
        _source: { type: 'visualization', visualization: { visState: '{"type": "floppy_disk"}' } },
      },
      // cyber space
      {
        _id: 'cyber:visualization:coolviz-789',
        _source: { type: 'visualization', visualization: { visState: '{"type": "floppy_disk"}' } },
      },
      {
        _id: 'cyber:visualization:coolviz-789',
        _source: { type: 'visualization', visualization: { visState: '{"type": "floppy_disk"}' } },
      },
      {
        _id: 'cyber:visualization:coolviz-123',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "cave_painting"}' },
        },
      },
    ]);

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
        stats: {
          cave_painting: { total: 3, spaces_min: 1, spaces_max: 1, spaces_avg: 1 },
          printing_press: { total: 1, spaces_min: 1, spaces_max: 1, spaces_avg: 1 },
          cuneiform: { total: 2, spaces_min: 2, spaces_max: 2, spaces_avg: 2 },
          floppy_disk: { total: 4, spaces_min: 2, spaces_max: 2, spaces_avg: 2 },
        },
      },
    });
  });
});
