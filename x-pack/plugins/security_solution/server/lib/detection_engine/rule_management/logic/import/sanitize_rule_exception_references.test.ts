/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { sanitizeRuleExceptionReferences } from './sanitize_rule_exception_references';

describe('sanitizeRuleExceptionReferences', () => {
  it('returns empty array if rule has no exception list references', () => {
    const rule = getImportRulesSchemaMock({ exceptions_list: [] });
    const result = sanitizeRuleExceptionReferences({
      existingLists: {},
      rule,
    });

    expect(rule).toEqual(getImportRulesSchemaMock({ exceptions_list: [] }));
    expect(result).toEqual([]);
  });

  it('does not modify exceptions reference array if they match existing lists', () => {
    const rule = getImportRulesSchemaMock({
      exceptions_list: [
        { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
      ],
    });

    const result = sanitizeRuleExceptionReferences({
      existingLists: {
        'my-list': {
          ...getExceptionListSchemaMock(),
          list_id: 'my-list',
          namespace_type: 'single',
          type: 'detection',
        },
      },
      rule,
    });

    expect(rule).toEqual(
      getImportRulesSchemaMock({
        exceptions_list: [
          { id: '1', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
        ],
      })
    );
    expect(result).toEqual([]);
  });

  it('removes an exception reference if list not found to exist', () => {
    const rule = getImportRulesSchemaMock({
      exceptions_list: [
        { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
      ],
    });

    const result = sanitizeRuleExceptionReferences({
      existingLists: {},
      rule,
    });

    expect(rule).toEqual(
      getImportRulesSchemaMock({
        exceptions_list: [],
      })
    );
    expect(result).toEqual([
      {
        error: {
          message:
            'Rule with rule_id: "rule-1" references a non existent exception list of list_id: "my-list". Reference has been removed.',
          status_code: 400,
        },
        rule_id: 'rule-1',
      },
    ]);
  });

  it('removes an exception reference if list namespace_type does not match', () => {
    const rule = getImportRulesSchemaMock({
      exceptions_list: [
        { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
      ],
    });
    const result = sanitizeRuleExceptionReferences({
      existingLists: {
        'my-list': {
          ...getExceptionListSchemaMock(),
          list_id: 'my-list',
          namespace_type: 'agnostic',
          type: 'detection',
        },
      },
      rule,
    });

    expect(rule).toEqual(
      getImportRulesSchemaMock({
        exceptions_list: [],
      })
    );
    expect(result).toEqual([
      {
        error: {
          message:
            'Rule with rule_id: "rule-1" references a non existent exception list of list_id: "my-list". Reference has been removed.',
          status_code: 400,
        },
        rule_id: 'rule-1',
      },
    ]);
  });

  it('removes an exception reference if list type does not match', () => {
    const rule = getImportRulesSchemaMock({
      exceptions_list: [
        { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
      ],
    });

    const result = sanitizeRuleExceptionReferences({
      existingLists: {
        'my-list': {
          ...getExceptionListSchemaMock(),
          list_id: 'my-list',
          namespace_type: 'single',
          type: 'endpoint',
        },
      },
      rule,
    });

    expect(rule).toEqual(
      getImportRulesSchemaMock({
        exceptions_list: [],
      })
    );
    expect(result).toEqual([
      {
        error: {
          message:
            'Rule with rule_id: "rule-1" references a non existent exception list of list_id: "my-list". Reference has been removed.',
          status_code: 400,
        },
        rule_id: 'rule-1',
      },
    ]);
  });
});
