/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBurnRateRule } from '../fixtures/rule';
import { buildQuery } from './build_query';
import { createKQLCustomIndicator, createSLO } from '../../../../services/slo/fixtures/slo';
import { getBurnRateWindows } from '../executor';

const DATE_START = '2022-12-29T00:00:00.000Z';
const DATE_END = '2023-01-01T00:00:00.000Z';

describe('buildQuery()', () => {
  it('should return a valid query for occurrences', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    const burnRateWindows = getBurnRateWindows(rule.windows);
    expect(buildQuery(slo, DATE_START, DATE_END, burnRateWindows)).toMatchSnapshot();
  });
  it('should return a valid query with afterKey', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    const burnRateWindows = getBurnRateWindows(rule.windows);
    expect(
      buildQuery(slo, DATE_START, DATE_END, burnRateWindows, {
        instanceId: 'example',
      })
    ).toMatchSnapshot();
  });
  it('should return a valid query for timeslices', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
      budgetingMethod: 'timeslices',
    });
    const rule = createBurnRateRule(slo);
    const burnRateWindows = getBurnRateWindows(rule.windows);
    expect(buildQuery(slo, DATE_START, DATE_END, burnRateWindows)).toMatchSnapshot();
  });
});
