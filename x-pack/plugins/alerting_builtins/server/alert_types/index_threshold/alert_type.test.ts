/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingServiceMock } from '../../../../../../src/core/server/mocks';
import { getAlertType } from './alert_type';
import { Params } from './alert_type_params';

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
    const params: Partial<Writable<Params>> = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'count',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '<',
      threshold: [0],
    };

    expect(alertType.validate?.params?.validate(params)).toBeTruthy();
  });

  it('validator fails with invalid params', async () => {
    const paramsSchema = alertType.validate?.params;
    if (!paramsSchema) throw new Error('params validator not set');

    const params: Partial<Writable<Params>> = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [0],
    };

    expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
      `"[aggType]: invalid aggType: \\"foo\\""`
    );
  });
});
