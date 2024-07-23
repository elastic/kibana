/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLODefinition } from '../../../../domain/models';
import { Rule } from '@kbn/alerting-plugin/common';
import { BurnRateRuleParams } from '../types';
import { shouldSuppressInstanceId } from './should_suppress_instance_id';
import { ALL_VALUE } from '@kbn/slo-schema';

describe('shouldSuppressInstanceId', () => {
  it('should suppress when supressAll is encountered', () => {
    const results = [
      {
        slo: {} as unknown as SLODefinition,
        rule: {} as unknown as Rule<BurnRateRuleParams>,
        suppressAll: true,
        instanceIdsToSuppress: [],
      },
    ];
    expect(shouldSuppressInstanceId(results, 'foo')).toBeTruthy();
    expect(shouldSuppressInstanceId(results, ALL_VALUE)).toBeTruthy();
  });
  it('should suppress when instanceId is ALL_VALUE and any instanceId matches', () => {
    const results = [
      {
        slo: {} as unknown as SLODefinition,
        rule: {} as unknown as Rule<BurnRateRuleParams>,
        suppressAll: false,
        instanceIdsToSuppress: ['foo'],
      },
    ];
    expect(shouldSuppressInstanceId(results, ALL_VALUE)).toBeTruthy();
  });
  it('should suppress when instanceId is matching the same instanceId in the results', () => {
    const results = [
      {
        slo: {} as unknown as SLODefinition,
        rule: {} as unknown as Rule<BurnRateRuleParams>,
        suppressAll: false,
        instanceIdsToSuppress: ['foo'],
      },
    ];
    expect(shouldSuppressInstanceId(results, 'foo')).toBeTruthy();
    expect(shouldSuppressInstanceId(results, 'bar')).not.toBeTruthy();
  });
});
