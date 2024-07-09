/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBaseRuleParams } from '../../../../rule_schema/mocks';
import { commonParamsCamelToSnake } from './common_params_camel_to_snake';

describe('commonParamsCamelToSnake', () => {
  test('should convert rule_source params to snake case', () => {
    const transformedParams = commonParamsCamelToSnake({
      ...getBaseRuleParams(),
      ruleSource: {
        type: 'external',
        isCustomized: false,
      },
    });
    expect(transformedParams).toEqual(
      expect.objectContaining({
        rule_source: {
          type: 'external',
          is_customized: false,
        },
      })
    );
  });
});
