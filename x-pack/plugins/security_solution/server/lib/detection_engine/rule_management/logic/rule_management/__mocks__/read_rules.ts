/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { getRuleMock } from '../../../../routes/__mocks__/request_responses';
import type { RuleParams } from '../../../../rule_schema';

export const readRules = jest
  .fn()
  .mockImplementation(async (): Promise<SanitizedRule<RuleParams> | null> => {
    const mockRule: SanitizedRule<RuleParams> = getRuleMock({
      ...getQueryRuleParams(),
      ruleId: 'rule-id',
    });
    return mockRule;
  });
