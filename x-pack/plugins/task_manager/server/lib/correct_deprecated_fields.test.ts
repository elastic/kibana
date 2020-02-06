/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ensureDeprecatedFieldsAreCorrected } from './correct_deprecated_fields';
import { mockLogger } from '../test_utils';

describe('ensureDeprecatedFieldsAreCorrected', () => {
  test('doesnt change tasks without any schedule fields', async () => {
    expect(
      ensureDeprecatedFieldsAreCorrected(
        {
          id: 'my-foo-id',
          taskType: 'foo',
          params: {},
          state: {},
        },
        mockLogger()
      )
    ).toEqual({
      id: 'my-foo-id',
      taskType: 'foo',
      params: {},
      state: {},
    });
  });
  test('doesnt change tasks with the schedule field', async () => {
    expect(
      ensureDeprecatedFieldsAreCorrected(
        {
          id: 'my-foo-id',
          taskType: 'foo',
          schedule: { interval: '10m' },
          params: {},
          state: {},
        },
        mockLogger()
      )
    ).toEqual({
      id: 'my-foo-id',
      taskType: 'foo',
      schedule: { interval: '10m' },
      params: {},
      state: {},
    });
  });
  test('corrects tasks with the deprecated inteval field', async () => {
    expect(
      ensureDeprecatedFieldsAreCorrected(
        {
          id: 'my-foo-id',
          taskType: 'foo',
          interval: '10m',
          params: {},
          state: {},
        },
        mockLogger()
      )
    ).toEqual({
      id: 'my-foo-id',
      taskType: 'foo',
      schedule: { interval: '10m' },
      params: {},
      state: {},
    });
  });
  test('logs a warning when a deprecated inteval is corrected on a task', async () => {
    const logger = mockLogger();
    ensureDeprecatedFieldsAreCorrected(
      {
        taskType: 'foo',
        interval: '10m',
        params: {},
        state: {},
      },
      logger
    );
    expect(logger.warn).toHaveBeenCalledWith(
      `Task of type "foo" has been scheduled with the deprecated 'interval' field which is due to be removed in a future release`
    );
  });
  test('logs a warning when a deprecated inteval is corrected on a task with an id', async () => {
    const logger = mockLogger();
    ensureDeprecatedFieldsAreCorrected(
      {
        id: 'my-foo-id',
        taskType: 'foo',
        interval: '10m',
        params: {},
        state: {},
      },
      logger
    );
    expect(logger.warn).toHaveBeenCalledWith(
      `Task "my-foo-id" of type "foo" has been scheduled with the deprecated 'interval' field which is due to be removed in a future release`
    );
  });
});
