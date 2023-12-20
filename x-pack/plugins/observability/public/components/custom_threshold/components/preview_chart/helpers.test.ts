/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Aggregators,
  CustomThresholdExpressionMetric,
} from '../../../../../common/custom_threshold_rule/types';
import { getLensOperationFromRuleMetric } from './helpers';

describe('getLensOperationFromRuleMetric', () => {
  it('returns the correct operation for SUM agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.SUM,
      field: 'system.cpu.user.pct',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual('sum(system.cpu.user.pct)');
  });
  it('returns the correct operation for MAX agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.MAX,
      field: 'system.cpu.user.pct',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual('max(system.cpu.user.pct)');
  });
  it('returns the correct operation for MIN agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.MIN,
      field: 'system.cpu.user.pct',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual('min(system.cpu.user.pct)');
  });
  it('returns the correct operation for AVERAGE agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.AVERAGE,
      field: 'system.cpu.user.pct',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual('average(system.cpu.user.pct)');
  });
  it('returns the correct operation for COUNT agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.COUNT,
      field: 'system.cpu.user.pct',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual('count(___records___)');
  });

  it('returns the correct operation for COUNT agg with KQL filter', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.COUNT,
      filter: 'host.name : "foo"',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual(
      `count(___records___, kql='host.name : foo')`
    );
  });
  it('returns the correct operation for CARDINALITY agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.CARDINALITY,
      field: 'system.cpu.user.pct',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual('unique_count(system.cpu.user.pct)');
  });
  it('returns the correct operation for P95 agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.P95,
      field: 'system.cpu.user.pct',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual(
      'percentile(system.cpu.user.pct, percentile=95)'
    );
  });
  it('returns the correct operation for P95 agg with KQL filter', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.P95,
      field: 'system.cpu.user.pct',
      filter: 'host.name : "foo"',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual(
      `percentile(system.cpu.user.pct, percentile=95, kql='host.name : foo')`
    );
  });

  it('returns the correct operation for P99 agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.P99,
      field: 'system.cpu.user.pct',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual(
      'percentile(system.cpu.user.pct, percentile=99)'
    );
  });
  it('returns the correct operation for RATE agg', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.RATE,
      field: 'system.network.in.bytes',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual(
      `counter_rate(max(system.network.in.bytes), kql='')`
    );
  });
  it('returns the correct operation for RATE agg with filter', () => {
    const metric: CustomThresholdExpressionMetric = {
      aggType: Aggregators.RATE,
      field: 'system.network.in.bytes',
      filter: 'host.name : "foo"',
      name: '',
    };
    expect(getLensOperationFromRuleMetric(metric)).toEqual(
      `counter_rate(max(system.network.in.bytes), kql='host.name : foo')`
    );
  });
});
