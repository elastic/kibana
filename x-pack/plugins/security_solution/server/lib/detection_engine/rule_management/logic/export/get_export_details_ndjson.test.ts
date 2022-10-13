/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { getRulesSchemaMock } from '../../../../../../common/detection_engine/schemas/response/rules_schema.mocks';

describe('getExportDetailsNdjson', () => {
  test('it ends with a new line character', () => {
    const rule = getRulesSchemaMock();
    const details = getExportDetailsNdjson([rule]);
    expect(details.endsWith('\n')).toEqual(true);
  });

  test('it exports a correct count given a single rule and no missing rules', () => {
    const rule = getRulesSchemaMock();
    const details = getExportDetailsNdjson([rule]);
    const reParsed = JSON.parse(details);
    expect(reParsed).toEqual({
      exported_count: 1,
      exported_rules_count: 1,
      missing_rules: [],
      missing_rules_count: 0,
    });
  });

  test('it exports a correct count given a no rules and a single missing rule', () => {
    const missingRule = { rule_id: 'rule-1' };
    const details = getExportDetailsNdjson([], [missingRule]);
    const reParsed = JSON.parse(details);
    expect(reParsed).toEqual({
      exported_count: 0,
      exported_rules_count: 0,
      missing_rules: [{ rule_id: 'rule-1' }],
      missing_rules_count: 1,
    });
  });

  test('it exports a correct count given multiple rules and multiple missing rules', () => {
    const rule1 = getRulesSchemaMock();
    const rule2 = getRulesSchemaMock();
    rule2.rule_id = 'some other id';
    rule2.id = 'some other id';

    const missingRule1 = { rule_id: 'rule-1' };
    const missingRule2 = { rule_id: 'rule-2' };

    const details = getExportDetailsNdjson([rule1, rule2], [missingRule1, missingRule2]);
    const reParsed = JSON.parse(details);
    expect(reParsed).toEqual({
      exported_count: 2,
      exported_rules_count: 2,
      missing_rules: [missingRule1, missingRule2],
      missing_rules_count: 2,
    });
  });
});
