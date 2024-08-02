/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSlo } from '../../../data/slo/slo';
import { getLensDefinitionInterval } from './utils';

describe('getLensDefinitionInterval', () => {
  it('returns auto when the date range is greater than 24 hours', () => {
    const dataTimeRange = {
      from: new Date('2021-07-01T00:00:00.000Z'),
      to: new Date('2021-07-03T00:00:00.000Z'),
    };
    const slo = buildSlo({
      budgetingMethod: 'timeslices',
      objective: { target: 0.99, timesliceWindow: '1h', timesliceTarget: 0.98 },
    });
    expect(getLensDefinitionInterval(dataTimeRange, slo)).toBe('auto');
  });

  it('returns auto when the SLO budgeting method is occurences', () => {
    const dataTimeRange = {
      from: new Date('2021-07-01T00:00:00.000Z'),
      to: new Date('2021-07-03T00:00:00.000Z'),
    };
    const slo = buildSlo({
      budgetingMethod: 'occurrences',
    });
    expect(getLensDefinitionInterval(dataTimeRange, slo)).toBe('auto');
  });

  it('returns the timesliceWindow when the SLO budgeting method is timeslice and range duration is lower than 24h', () => {
    const dataTimeRange = {
      from: new Date('2021-07-01T00:00:00.000Z'),
      to: new Date('2021-07-01T23:59:00.000Z'),
    };
    const slo = buildSlo({
      budgetingMethod: 'timeslices',
      objective: { target: 0.99, timesliceWindow: '1h', timesliceTarget: 0.98 },
    });
    expect(getLensDefinitionInterval(dataTimeRange, slo)).toBe('1h');
  });
});
