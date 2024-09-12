/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { getListArrayMock } from '../../../../../../common/detection_engine/schemas/types/lists.mock';
import { PrebuiltRuleAsset, TypeSpecificFields } from './prebuilt_rule_asset';
import { getPrebuiltRuleMock, getPrebuiltThreatMatchRuleMock } from './prebuilt_rule_asset.mock';
import { TypeSpecificCreatePropsInternal } from '../../../../../../common/api/detection_engine';

describe('Prebuilt rule asset schema', () => {
  it('can be of all rule types that are supported', () => {
    // Check that the discriminated union TypeSpecificFields, which is used to create
    // the PrebuiltRuleAsset schema, contains all the rule types that are supported.
    const createPropsTypes = TypeSpecificCreatePropsInternal.options.map(
      (option) => option.shape.type.value
    );
    const fieldsTypes = TypeSpecificFields.options.map((option) => option.shape.type.value);

    expect(createPropsTypes).toHaveLength(fieldsTypes.length);
    expect(new Set(createPropsTypes)).toEqual(new Set(fieldsTypes));
  });

  test('empty objects do not validate', () => {
    const payload: Partial<PrebuiltRuleAsset> = {};

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"name: Required, description: Required, risk_score: Required, severity: Required, type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql', and 2 more"`
    );
  });

  test('made up values get omitted', () => {
    const payload: PrebuiltRuleAsset & { madeUp: string } = {
      ...getPrebuiltRuleMock(),
      madeUp: 'hi',
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(getPrebuiltRuleMock());
  });

  describe('omitted fields from the rule schema are ignored', () => {
    // The PrebuiltRuleAsset schema is built out of the rule schema,
    // but the following fields are manually omitted.
    // See: detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset.ts
    const omittedBaseFields = [
      'actions',
      'throttle',
      'meta',
      'output_index',
      'namespace',
      'alias_purpose',
      'alias_target_id',
      'outcome',
    ];

    test.each(omittedBaseFields)(
      'ignores the base %s field since it`s an omitted field',
      (field) => {
        const payload: Partial<PrebuiltRuleAsset> & Record<string, unknown> = {
          ...getPrebuiltRuleMock(),
          [field]: 'some value',
        };

        const result = PrebuiltRuleAsset.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data).toEqual(getPrebuiltRuleMock());
      }
    );
  });

  test('[rule_id] does not validate', () => {
    const payload: Partial<PrebuiltRuleAsset> = {
      rule_id: 'rule-1',
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"name: Required, description: Required, risk_score: Required, severity: Required, type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql', and 1 more"`
    );
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, version] does validate', () => {
    const payload: Partial<PrebuiltRuleAsset> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      risk_score: 50,
      version: 1,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can send in an empty array to threat', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      threat: [],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate', () => {
    const payload: PrebuiltRuleAsset = {
      rule_id: 'rule-1',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      threat: [
        {
          framework: 'someFramework',
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
      version: 1,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('allows references to be sent as valid', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      references: ['index-1'],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('immutable is omitted from a pre-packaged rule', () => {
    const payload: PrebuiltRuleAsset & { immutable: boolean } = {
      ...getPrebuiltRuleMock(),
      immutable: true,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(getPrebuiltRuleMock());
  });

  test('rule_id is required', () => {
    const payload: PrebuiltRuleAsset = getPrebuiltRuleMock();
    // @ts-expect-error
    delete payload.rule_id;

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"rule_id: Required"`);
  });

  test('references cannot be numbers', () => {
    const payload: Omit<PrebuiltRuleAsset, 'references'> & { references: number[] } = {
      ...getPrebuiltRuleMock(),
      references: [5],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"references.0: Expected string, received number"`
    );
  });

  test('indexes cannot be numbers', () => {
    const payload: Omit<PrebuiltRuleAsset, 'index'> & { index: number[] } = {
      ...getPrebuiltRuleMock(),
      index: [5],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"index.0: Expected string, received number"`
    );
  });

  test('saved_query type can have filters with it', () => {
    const payload = {
      ...getPrebuiltRuleMock(),
      filters: [],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('filters cannot be a string', () => {
    const payload: Omit<PrebuiltRuleAsset, 'filters'> & { filters: string } = {
      ...getPrebuiltRuleMock(),
      filters: 'some string',
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"filters: Expected array, received string"`
    );
  });

  test('language validates with kuery', () => {
    const payload = {
      ...getPrebuiltRuleMock(),
      language: 'kuery',
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('language validates with lucene', () => {
    const payload = {
      ...getPrebuiltRuleMock(),
      language: 'lucene',
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('language does not validate with something made up', () => {
    const payload: Omit<PrebuiltRuleAsset, 'language'> & { language: string } = {
      ...getPrebuiltRuleMock(),
      language: 'something-made-up',
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"language: Invalid enum value. Expected 'kuery' | 'lucene', received 'something-made-up'"`
    );
  });

  test('max_signals cannot be negative', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      max_signals: -1,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"max_signals: Number must be greater than or equal to 1"`
    );
  });

  test('max_signals cannot be zero', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      max_signals: 0,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"max_signals: Number must be greater than or equal to 1"`
    );
  });

  test('max_signals can be 1', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      max_signals: 1,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can optionally send in an array of tags', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      tags: ['tag_1', 'tag_2'],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot send in an array of tags that are numbers', () => {
    const payload: Omit<PrebuiltRuleAsset, 'tags'> & { tags: number[] } = {
      ...getPrebuiltRuleMock(),
      tags: [0, 1, 2],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"tags.0: Expected string, received number, tags.1: Expected string, received number, tags.2: Expected string, received number"`
    );
  });

  test('You cannot send in an array of threat that are missing "framework"', () => {
    const payload: Omit<PrebuiltRuleAsset, 'threat'> & {
      threat: Array<Partial<Omit<PrebuiltRuleAsset['threat'], 'framework'>>>;
    } = {
      ...getPrebuiltRuleMock(),
      threat: [
        {
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"threat.0.framework: Required"`);
  });

  test('You cannot send in an array of threat that are missing "tactic"', () => {
    const payload: Omit<PrebuiltRuleAsset, 'threat'> & {
      threat: Array<Partial<Omit<PrebuiltRuleAsset['threat'], 'tactic'>>>;
    } = {
      ...getPrebuiltRuleMock(),
      threat: [
        {
          framework: 'fake',
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"threat.0.tactic: Required"`);
  });

  test('You can send in an array of threat that are missing "technique"', () => {
    const payload: Omit<PrebuiltRuleAsset, 'threat'> & {
      threat: Array<Partial<Omit<PrebuiltRuleAsset['threat'], 'technique'>>>;
    } = {
      ...getPrebuiltRuleMock(),
      threat: [
        {
          framework: 'fake',
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
        },
      ],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can optionally send in an array of false positives', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      false_positives: ['false_1', 'false_2'],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    const payload: Omit<PrebuiltRuleAsset, 'false_positives'> & {
      false_positives: number[];
    } = {
      ...getPrebuiltRuleMock(),
      false_positives: [5, 4],
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"false_positives.0: Expected string, received number, false_positives.1: Expected string, received number"`
    );
  });

  test('You cannot set the risk_score to 101', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      risk_score: 101,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"risk_score: Number must be less than or equal to 100"`
    );
  });

  test('You cannot set the risk_score to -1', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      risk_score: -1,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"risk_score: Number must be greater than or equal to 0"`
    );
  });

  test('You can set the risk_score to 0', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      risk_score: 0,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can set the risk_score to 100', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      risk_score: 100,
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: PrebuiltRuleAsset = {
      ...getPrebuiltRuleMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload: Omit<PrebuiltRuleAsset, 'severity'> & { severity: string } = {
      ...getPrebuiltRuleMock(),
      severity: 'junk',
    };

    const result = PrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'junk'"`
    );
  });

  describe('note', () => {
    test('You can set note to a string', () => {
      const payload: PrebuiltRuleAsset = {
        ...getPrebuiltRuleMock(),
        note: '# documentation markdown here',
      };

      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('You can set note to an empty string', () => {
      const payload: PrebuiltRuleAsset = {
        ...getPrebuiltRuleMock(),
        note: '',
      };

      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('You cannot create note as an object', () => {
      const payload: Omit<PrebuiltRuleAsset, 'note'> & { note: {} } = {
        ...getPrebuiltRuleMock(),
        note: {
          somethingHere: 'something else',
        },
      };

      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"note: Expected string, received object"`
      );
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note] does validate', () => {
      const payload: PrebuiltRuleAsset = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        risk_score: 50,
        note: '# some markdown',
        version: 1,
      };

      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, version, and exceptions_list] does validate', () => {
      const payload: PrebuiltRuleAsset = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
        version: 1,
        exceptions_list: getListArrayMock(),
      };

      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, version, and empty exceptions_list] does validate', () => {
      const payload: PrebuiltRuleAsset = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        version: 1,
        note: '# some markdown',
        exceptions_list: [],
      };

      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, version, and invalid exceptions_list] does NOT validate', () => {
      const payload = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        version: 1,
        note: '# some markdown',
        exceptions_list: [{ id: 'uuid_here', namespace_type: 'not a namespace type' }],
      };

      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"exceptions_list.0.list_id: Required, exceptions_list.0.type: Required, exceptions_list.0.namespace_type: Invalid enum value. Expected 'agnostic' | 'single', received 'not a namespace type'"`
      );
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, version, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: PrebuiltRuleAsset = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        version: 1,
        note: '# some markdown',
      };

      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  describe('threat_mapping', () => {
    test('You can set a threat query, index, mapping, filters on a pre-packaged rule', () => {
      const payload = getPrebuiltThreatMatchRuleMock();
      const result = PrebuiltRuleAsset.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });
});
