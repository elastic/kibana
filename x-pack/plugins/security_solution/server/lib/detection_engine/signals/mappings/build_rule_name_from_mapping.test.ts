/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId } from '../__mocks__/es_results';
import { buildRuleNameFromMapping } from './build_rule_name_from_mapping';

describe('buildRuleNameFromMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rule name defaults to provided if mapping is incomplete', () => {
    const ruleName = buildRuleNameFromMapping({
      doc: sampleDocNoSortId(),
      ruleName: 'rule-name',
      ruleNameMapping: 'message',
    });

    expect(ruleName).toEqual({ ruleName: 'rule-name', ruleNameMeta: {} });
  });

  // TODO: Enhance...
});
