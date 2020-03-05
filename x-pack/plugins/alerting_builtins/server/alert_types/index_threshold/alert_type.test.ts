/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingServiceMock } from '../../../../../../src/core/server/mocks';
import { getAlertType } from './alert_type';

describe('alertType', () => {
  const service = {
    indexThreshold: {
      timeSeriesQuery: jest.fn(),
    },
    logger: loggingServiceMock.create().get(),
  };

  const alertType = getAlertType(service);

  it('alert type creation structure is the expected value', async () => {
    expect(alertType.id).toBe('.index-threshold');
    expect(alertType.name).toBe('Index Threshold');
    expect(alertType.actionGroups).toEqual([{ id: 'threshold met', name: 'Threshold Met' }]);
  });

  it('validator succeeds with valid params', async () => {
    const params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'count',
      window: '5m',
      comparator: 'greaterThan',
      threshold: [0],
    };

    expect(alertType.validate?.params?.validate(params)).toBeTruthy();
  });

  it('validator fails with invalid params', async () => {
    const paramsSchema = alertType.validate?.params;
    if (!paramsSchema) throw new Error('params validator not set');

    const params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      window: '5m',
      comparator: 'greaterThan',
      threshold: [0],
    };

    expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
      `"[aggType]: invalid aggType: \\"foo\\""`
    );
  });
});
