/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { RuleResponse } from './rule_schemas.gen';
import {
  getRulesSchemaMock,
  getRulesMlSchemaMock,
  getSavedQuerySchemaMock,
  getThreatMatchingSchemaMock,
  getRulesEqlSchemaMock,
  getEsqlRuleSchemaMock,
} from './rule_response_schema.mock';

describe('Rule response schema', () => {
  test('it should validate a type of "query" without anything extra', () => {
    const payload = getRulesSchemaMock();

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should strip any extra data', () => {
    const payload: RuleResponse & { invalid_extra_data?: string } = getRulesSchemaMock();
    payload.invalid_extra_data = 'invalid_extra_data';
    const expected = getRulesSchemaMock();

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(expected);
  });

  test('it should NOT validate invalid_data for the type', () => {
    const payload: Omit<RuleResponse, 'type'> & { type: string } = getRulesSchemaMock();
    payload.type = 'invalid_data';

    const result = RuleResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"`
    );
  });

  test('it should validate a type of "query" with a saved_id together', () => {
    const payload: RuleResponse & { saved_id?: string } = getRulesSchemaMock();
    payload.type = 'query';
    payload.saved_id = 'save id 123';

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate a type of "saved_query" with a "saved_id" dependent', () => {
    const payload = getSavedQuerySchemaMock();

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
    const payload: RuleResponse & { saved_id?: string } = getSavedQuerySchemaMock();
    // @ts-expect-error
    delete payload.saved_id;

    const result = RuleResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"saved_id: Required"`);
  });

  test('it should validate a type of "timeline_id" if there is a "timeline_title" dependent', () => {
    const payload = getRulesSchemaMock();
    payload.timeline_id = 'some timeline id';
    payload.timeline_title = 'some timeline title';

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  describe('exceptions_list', () => {
    test('it should validate an empty array for "exceptions_list"', () => {
      const payload = getRulesSchemaMock();
      payload.exceptions_list = [];

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should NOT validate when "exceptions_list" is not expected type', () => {
      const payload: Omit<RuleResponse, 'exceptions_list'> & {
        exceptions_list?: string;
      } = { ...getRulesSchemaMock(), exceptions_list: 'invalid_data' };

      const result = RuleResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"exceptions_list: Expected array, received string"`
      );
    });
  });

  describe('esql rule type', () => {
    test('it should omit the "index" field', () => {
      const payload = { ...getEsqlRuleSchemaMock(), index: ['logs-*'] };
      const expected = getEsqlRuleSchemaMock();

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });

    test('it should omit the "filters" field', () => {
      const payload = { ...getEsqlRuleSchemaMock(), filters: [] };
      const expected = getEsqlRuleSchemaMock();

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });

    test('it should omit the "saved_id" field', () => {
      const payload = { ...getEsqlRuleSchemaMock(), saved_id: 'id' };
      const expected = getEsqlRuleSchemaMock();

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });
  });

  describe('data_view_id', () => {
    test('it should validate a type of "query" with "data_view_id" defined', () => {
      const payload = { ...getRulesSchemaMock(), data_view_id: 'logs-*' };

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate a type of "saved_query" with "data_view_id" defined', () => {
      const payload: RuleResponse & { saved_id?: string; data_view_id?: string } =
        getSavedQuerySchemaMock();
      payload.data_view_id = 'logs-*';

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate a type of "eql" with "data_view_id" defined', () => {
      const payload = { ...getRulesEqlSchemaMock(), data_view_id: 'logs-*' };

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate a type of "threat_match" with "data_view_id" defined', () => {
      const payload = { ...getThreatMatchingSchemaMock(), data_view_id: 'logs-*' };

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should omit the "data_view_id" field for "machine_learning"rules', () => {
      const payload = { ...getRulesMlSchemaMock(), data_view_id: 'logs-*' };
      const expected = getRulesMlSchemaMock();

      const result = RuleResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });
  });

  test('it should omit the "data_view_id" field for "esql" rules', () => {
    const payload = { ...getEsqlRuleSchemaMock(), data_view_id: 'logs-*' };
    const expected = getEsqlRuleSchemaMock();

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(expected);
  });
});

describe('investigation_fields', () => {
  test('it should validate rule with "investigation_fields"', () => {
    const payload = getRulesSchemaMock();
    payload.investigation_fields = { field_names: ['foo', 'bar'] };

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate undefined for "investigation_fields"', () => {
    const payload: RuleResponse = {
      ...getRulesSchemaMock(),
      investigation_fields: undefined,
    };

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should NOT validate an empty array for "investigation_fields.field_names"', () => {
    const payload: RuleResponse = {
      ...getRulesSchemaMock(),
      investigation_fields: {
        field_names: [],
      },
    };

    const result = RuleResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'investigation_fields.field_names: Array must contain at least 1 element(s)'
    );
  });

  test('it should NOT validate a string for "investigation_fields"', () => {
    const payload: Omit<RuleResponse, 'investigation_fields'> & {
      investigation_fields: string;
    } = {
      ...getRulesSchemaMock(),
      investigation_fields: 'foo',
    };

    const result = RuleResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"investigation_fields: Expected object, received string"`
    );
  });
});

describe('rule_source', () => {
  test('it should validate a rule with "rule_source" set to internal', () => {
    const payload = getRulesSchemaMock();
    payload.rule_source = {
      type: 'internal',
    };

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate a rule with "rule_source" set to external', () => {
    const payload = getRulesSchemaMock();
    payload.rule_source = {
      type: 'external',
      is_customized: true,
    };

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate a rule with "rule_source" set to undefined', () => {
    const payload = getRulesSchemaMock();
    payload.rule_source = undefined;

    const result = RuleResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });
});
