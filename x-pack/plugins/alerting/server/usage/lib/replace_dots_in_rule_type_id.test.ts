/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceDotSymbolsInRuleTypeIds } from './replace_dots_in_rule_type_id';

describe('replaceDotSymbolsInRuleTypeIds', () => {
  test('should replace "." symbols with "__" in rule types names', async () => {
    expect(
      replaceDotSymbolsInRuleTypeIds({
        '.index-threshold': 2,
        'document.test.': 1,
        'logs.alert.document.count': 1,
      })
    ).toEqual({
      '__index-threshold': 2,
      document__test__: 1,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      logs__alert__document__count: 1,
    });
  });
});
