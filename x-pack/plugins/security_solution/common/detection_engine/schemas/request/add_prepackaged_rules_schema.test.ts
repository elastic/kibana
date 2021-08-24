/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addPrepackagedRulesSchema,
  AddPrepackagedRulesSchemaDecoded,
  AddPrepackagedRulesSchema,
  racAddPrepackagedRulesSchema,
} from './add_prepackaged_rules_schema';

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import {
  getAddPrepackagedRulesSchemaMock,
  getAddPrepackagedRulesSchemaDecodedMock,
  getAddPrepackagedThreatMatchRulesSchemaMock,
  getAddPrepackagedThreatMatchRulesSchemaDecodedMock,
} from './add_prepackaged_rules_schema.mock';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';
import { getListArrayMock } from '../types/lists.mock';

describe('add prepackaged rules schema', () => {
  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('empty objects do not validate - %s', (_, isRuleRegistryEnabled) => {
    const payload: Partial<AddPrepackagedRulesSchema> = {};

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(
      [
        'Invalid value "undefined" supplied to "description"',
        'Invalid value "undefined" supplied to "risk_score"',
        'Invalid value "undefined" supplied to "name"',
        'Invalid value "undefined" supplied to "severity"',
        'Invalid value "undefined" supplied to "type"',
        'Invalid value "undefined" supplied to "rule_id"',
        'Invalid value "undefined" supplied to "version"',
      ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
    );
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('made up values do not validate - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      madeUp: 'hi',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('[rule_id] does not validate - %s', (_, isRuleRegistryEnabled) => {
    const payload: Partial<AddPrepackagedRulesSchema> = {
      rule_id: 'rule-1',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(
      [
        'Invalid value "undefined" supplied to "description"',
        'Invalid value "undefined" supplied to "risk_score"',
        'Invalid value "undefined" supplied to "name"',
        'Invalid value "undefined" supplied to "severity"',
        'Invalid value "undefined" supplied to "type"',
        'Invalid value "undefined" supplied to "version"',
      ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
    );
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('[rule_id, description] does not validate - %s', (_, isRuleRegistryEnabled) => {
    const payload: Partial<AddPrepackagedRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(
      [
        'Invalid value "undefined" supplied to "risk_score"',
        'Invalid value "undefined" supplied to "name"',
        'Invalid value "undefined" supplied to "severity"',
        'Invalid value "undefined" supplied to "type"',
        'Invalid value "undefined" supplied to "version"',
      ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
    );
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('[rule_id, description, from] does not validate - %s', (_, isRuleRegistryEnabled) => {
    const payload: Partial<AddPrepackagedRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(
      [
        'Invalid value "undefined" supplied to "risk_score"',
        'Invalid value "undefined" supplied to "name"',
        'Invalid value "undefined" supplied to "severity"',
        'Invalid value "undefined" supplied to "type"',
        'Invalid value "undefined" supplied to "version"',
      ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
    );
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('[rule_id, description, from, to] does not validate - %s', (_, isRuleRegistryEnabled) => {
    const payload: Partial<AddPrepackagedRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(
      [
        'Invalid value "undefined" supplied to "risk_score"',
        'Invalid value "undefined" supplied to "name"',
        'Invalid value "undefined" supplied to "severity"',
        'Invalid value "undefined" supplied to "type"',
        'Invalid value "undefined" supplied to "version"',
      ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
    );
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, name] does not validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(
        [
          'Invalid value "undefined" supplied to "risk_score"',
          'Invalid value "undefined" supplied to "severity"',
          'Invalid value "undefined" supplied to "type"',
          'Invalid value "undefined" supplied to "version"',
        ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
      );
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, name, severity] does not validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(
        [
          'Invalid value "undefined" supplied to "risk_score"',
          'Invalid value "undefined" supplied to "type"',
          'Invalid value "undefined" supplied to "version"',
        ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
      );
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, name, severity, type] does not validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(
        [
          'Invalid value "undefined" supplied to "risk_score"',
          'Invalid value "undefined" supplied to "version"',
        ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
      );
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, name, severity, type, interval] does not validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(
        [
          'Invalid value "undefined" supplied to "risk_score"',
          'Invalid value "undefined" supplied to "version"',
        ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
      );
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, name, severity, type, interval, index] does not validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        interval: '5m',
        index: ['index-1'],
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(
        [
          'Invalid value "undefined" supplied to "risk_score"',
          'Invalid value "undefined" supplied to "version"',
        ].concat(isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : [])
      );
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, name, severity, type, query, index, interval, version] does validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload = {
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        query: 'some query',
        index: ['index-1'],
        interval: '5m',
        version: 1,
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected = {
        author: [],
        severity_mapping: [],
        risk_score_mapping: [],
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        query: 'some query',
        index: ['index-1'],
        interval: '5m',
        references: [],
        actions: [],
        enabled: false,
        false_positives: [],
        max_signals: DEFAULT_MAX_SIGNALS,
        tags: [],
        threat: [],
        throttle: null,
        version: 1,
        exceptions_list: [],
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };
      expect(message.schema).toEqual(expected);
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
        risk_score: 50,
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(
        ['Invalid value "undefined" supplied to "version"'].concat(
          isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : []
        )
      );
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, index, name, severity, interval, type, query, language, version] does validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
        risk_score: 50,
        version: 1,
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected = {
        author: [],
        severity_mapping: [],
        risk_score_mapping: [],
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
        query: 'some query',
        language: 'kuery',
        references: [],
        actions: [],
        enabled: false,
        false_positives: [],
        max_signals: DEFAULT_MAX_SIGNALS,
        tags: [],
        threat: [],
        throttle: null,
        version: 1,
        exceptions_list: [],
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };
      expect(message.schema).toEqual(expected);
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does not validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> & { output_index: string } = {
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(
        ['Invalid value "undefined" supplied to "version"'].concat(
          isRuleRegistryEnabled ? ['Invalid value "undefined" supplied to "namespace"'] : []
        )
      );
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index, version] does not validate because output_index is not allowed - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> & { output_index: string } = {
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
        version: 1,
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "output_index"']);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, version] does validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Partial<AddPrepackagedRulesSchema> = {
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
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected = {
        author: [],
        severity_mapping: [],
        risk_score_mapping: [],
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
        actions: [],
        enabled: false,
        exceptions_list: [],
        false_positives: [],
        max_signals: 100,
        references: [],
        tags: [],
        threat: [],
        throttle: null,
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };
      expect(message.schema).toEqual(expected);
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You can send in an empty array to threat - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      threat: [],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      threat: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    '[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate - %s',
    (_, isRuleRegistryEnabled) => {
      const payload = {
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
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected = {
        author: [],
        severity_mapping: [],
        risk_score_mapping: [],
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
        references: [],
        actions: [],
        enabled: false,
        false_positives: [],
        max_signals: DEFAULT_MAX_SIGNALS,
        tags: [],
        throttle: null,
        version: 1,
        exceptions_list: [],
        ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
      };
      expect(message.schema).toEqual(expected);
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('allows references to be sent as valid - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      references: ['index-1'],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      references: ['index-1'],
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('defaults references to an array if it is not sent in - %s', (_, isRuleRegistryEnabled) => {
    const { references, ...noReferences } = getAddPrepackagedRulesSchemaMock(
      isRuleRegistryEnabled
    ) as AddPrepackagedRulesSchema;
    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(noReferences);
    const checked = exactCheck(noReferences, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      references: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('immutable cannot be set in a pre-packaged rule - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      immutable: true,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "immutable"']);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('defaults enabled to false - %s', (_, isRuleRegistryEnabled) => {
    const payload = getAddPrepackagedRulesSchemaMock(
      isRuleRegistryEnabled
    ) as AddPrepackagedRulesSchema;
    delete payload.enabled;

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(((message.schema as unknown) as AddPrepackagedRulesSchemaDecoded).enabled).toEqual(
      false
    );
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('rule_id is required - %s', (_, isRuleRegistryEnabled) => {
    const payload = getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled);
    // @ts-expect-error
    delete payload.rule_id;

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rule_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('references cannot be numbers - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      references: [5],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "references"']);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('indexes cannot be numbers - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      index: [5],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "index"']);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('defaults interval to 5 min - %s', (_, isRuleRegistryEnabled) => {
    const { interval, ...noInterval } = getAddPrepackagedRulesSchemaMock(
      isRuleRegistryEnabled
    ) as AddPrepackagedRulesSchema;
    const payload = {
      ...noInterval,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const {
      interval: expectedInterval,
      ...expectedNoInterval
    } = getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled);
    const expected = {
      ...expectedNoInterval,
      interval: '5m',
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('defaults max signals to 100 - %s', (_, isRuleRegistryEnabled) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { max_signals, ...noMaxSignals } = getAddPrepackagedRulesSchemaMock(
      isRuleRegistryEnabled
    ) as AddPrepackagedRulesSchema;
    const payload = {
      ...noMaxSignals,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const {
      max_signals: expectedMaxSignals,
      ...expectedNoMaxSignals
    } = getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled);
    const expected = {
      ...expectedNoMaxSignals,
      max_signals: 100,
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('saved_query type can have filters with it - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      filters: [],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('filters cannot be a string - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      filters: 'some string',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "filters"',
    ]);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('language validates with kuery - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      language: 'kuery',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      language: 'kuery',
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('language validates with lucene - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      language: 'lucene',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      language: 'lucene',
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('language does not validate with something made up - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      language: 'something-made-up',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "something-made-up" supplied to "language"',
    ]);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('max_signals cannot be negative - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      max_signals: -1,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "max_signals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('max_signals cannot be zero - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      max_signals: 0,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "0" supplied to "max_signals"']);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('max_signals can be 1 - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      max_signals: 1,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      max_signals: 1,
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You can optionally send in an array of tags - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      tags: ['tag_1', 'tag_2'],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      tags: ['tag_1', 'tag_2'],
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You cannot send in an array of tags that are numbers - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      tags: [0, 1, 2],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "tags"',
      'Invalid value "1" supplied to "tags"',
      'Invalid value "2" supplied to "tags"',
    ]);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot send in an array of threat that are missing "framework" - %s',
    (_, isRuleRegistryEnabled) => {
      const payload = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
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

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "threat,framework"',
      ]);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot send in an array of threat that are missing "tactic" - %s',
    (_, isRuleRegistryEnabled) => {
      const payload = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
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

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "threat,tactic"',
      ]);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You can send in an array of threat that are missing "technique" - %s',
    (_, isRuleRegistryEnabled) => {
      const payload = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
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

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected = {
        ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
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
      expect(message.schema).toEqual(expected);
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You can optionally send in an array of false positives - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      false_positives: ['false_1', 'false_2'],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      false_positives: ['false_1', 'false_2'],
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot send in an array of false positives that are numbers - %s',
    (_, isRuleRegistryEnabled) => {
      const payload = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        false_positives: [5, 4],
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "5" supplied to "false_positives"',
        'Invalid value "4" supplied to "false_positives"',
      ]);
      expect(message.schema).toEqual({});
    }
  );
  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You cannot set the risk_score to 101 - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      risk_score: 101,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "101" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You cannot set the risk_score to -1 - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      risk_score: -1,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "risk_score"']);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You can set the risk_score to 0 - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      risk_score: 0,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      risk_score: 0,
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You can set the risk_score to 100 - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      risk_score: 100,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      risk_score: 100,
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You can set meta to any object you want - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You cannot create meta as a string - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      meta: 'should not work',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "should not work" supplied to "meta"',
    ]);
    expect(message.schema).toEqual({});
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('You can omit the query string when filters are present - %s', (_, isRuleRegistryEnabled) => {
    const { query, ...noQuery } = getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled);
    const payload = {
      ...noQuery,
      filters: [],
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { query: expectedQuery, ...expectedNoQuery } = getAddPrepackagedRulesSchemaDecodedMock(
      isRuleRegistryEnabled
    );
    const expected = {
      ...expectedNoQuery,
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('validates with timeline_id and timeline_title - %s', (_, isRuleRegistryEnabled) => {
    const payload = {
      ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = {
      ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('The default for "from" will be "now-6m" - %s', (_, isRuleRegistryEnabled) => {
    const { from, ...noFrom } = getAddPrepackagedRulesSchemaMock(
      isRuleRegistryEnabled
    ) as AddPrepackagedRulesSchema;
    const payload = {
      ...noFrom,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { from: expectedFrom, ...expectedNoFrom } = getAddPrepackagedRulesSchemaDecodedMock(
      isRuleRegistryEnabled
    );
    const expected = {
      ...expectedNoFrom,
      from: 'now-6m',
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('The default for "to" will be "now" - %s', (_, isRuleRegistryEnabled) => {
    const { to, ...noTo } = getAddPrepackagedRulesSchemaMock(
      isRuleRegistryEnabled
    ) as AddPrepackagedRulesSchema;
    const payload = {
      ...noTo,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { to: expectedTo, ...expectedNoTo } = getAddPrepackagedRulesSchemaDecodedMock(
      isRuleRegistryEnabled
    );
    const expected = {
      ...expectedNoTo,
      to: 'now',
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot set the severity to a value other than low, medium, high, or critical - %s',
    (_, isRuleRegistryEnabled) => {
      const payload = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        severity: 'junk',
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "junk" supplied to "severity"',
      ]);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('The default for "actions" will be an empty array - %s', (_, isRuleRegistryEnabled) => {
    const { actions, ...noActions } = getAddPrepackagedRulesSchemaMock(
      isRuleRegistryEnabled
    ) as AddPrepackagedRulesSchema;
    const payload = {
      ...noActions,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const {
      actions: expectedActions,
      ...expectedNoActions
    } = getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled);
    const expected = {
      ...expectedNoActions,
      actions: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot send in an array of actions that are missing "group" - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Omit<AddPrepackagedRulesSchema['actions'], 'group'> = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        actions: [{ id: 'id', action_type_id: 'action_type_id', params: {} }],
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "actions,group"',
      ]);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot send in an array of actions that are missing "id" - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Omit<AddPrepackagedRulesSchema['actions'], 'id'> = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        actions: [{ group: 'group', action_type_id: 'action_type_id', params: {} }],
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "actions,id"',
      ]);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot send in an array of actions that are missing "action_type_id" - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Omit<AddPrepackagedRulesSchema['actions'], 'action_type_id'> = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        actions: [{ group: 'group', id: 'id', params: {} }],
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "actions,action_type_id"',
      ]);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot send in an array of actions that are missing "params" - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Omit<AddPrepackagedRulesSchema['actions'], 'params'> = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        actions: [{ group: 'group', id: 'id', action_type_id: 'action_type_id' }],
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "actions,params"',
      ]);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'You cannot send in an array of actions that are including "actionTypeId" - %s',
    (_, isRuleRegistryEnabled) => {
      const payload: Omit<AddPrepackagedRulesSchema['actions'], 'actions'> = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        actions: [
          {
            group: 'group',
            id: 'id',
            actionTypeId: 'actionTypeId',
            params: {},
          },
        ],
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "actions,action_type_id"',
      ]);
      expect(message.schema).toEqual({});
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('The default for "throttle" will be null - %s', (_, isRuleRegistryEnabled) => {
    const { throttle, ...noThrottle } = getAddPrepackagedRulesSchemaMock(
      isRuleRegistryEnabled
    ) as AddPrepackagedRulesSchema;
    const payload = {
      ...noThrottle,
    };

    const schema = isRuleRegistryEnabled ? racAddPrepackagedRulesSchema : addPrepackagedRulesSchema;
    const decoded = schema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const {
      throttle: expectedThrottle,
      ...expectedNoThrottle
    } = getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled);
    const expected = {
      ...expectedNoThrottle,
      throttle: null,
    };
    expect(message.schema).toEqual(expected);
  });

  describe('note', () => {
    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])('You can set note to a string - %s', (_, isRuleRegistryEnabled) => {
      const payload = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        note: '# documentation markdown here',
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected = {
        ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
        note: '# documentation markdown here',
      };
      expect(message.schema).toEqual(expected);
    });

    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])('You can set note to an empty string - %s', (_, isRuleRegistryEnabled) => {
      const payload = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        note: '',
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected = {
        ...getAddPrepackagedRulesSchemaDecodedMock(isRuleRegistryEnabled),
        note: '',
      };
      expect(message.schema).toEqual(expected);
    });

    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])('You cannot create note as an object - %s', (_, isRuleRegistryEnabled) => {
      const payload = {
        ...getAddPrepackagedRulesSchemaMock(isRuleRegistryEnabled),
        note: {
          somethingHere: 'something else',
        },
      };

      const schema = isRuleRegistryEnabled
        ? racAddPrepackagedRulesSchema
        : addPrepackagedRulesSchema;
      const decoded = schema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "{"somethingHere":"something else"}" supplied to "note"',
      ]);
      expect(message.schema).toEqual({});
    });

    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])(
      '[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note] does validate - %s',
      (_, isRuleRegistryEnabled) => {
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
          risk_score: 50,
          note: '# some markdown',
          version: 1,
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };

        const schema = isRuleRegistryEnabled
          ? racAddPrepackagedRulesSchema
          : addPrepackagedRulesSchema;
        const decoded = schema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const message = pipe(checked, foldLeftRight);
        expect(getPaths(left(message.errors))).toEqual([]);
        const expected = {
          author: [],
          severity_mapping: [],
          risk_score_mapping: [],
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
          references: [],
          actions: [],
          enabled: false,
          false_positives: [],
          max_signals: DEFAULT_MAX_SIGNALS,
          tags: [],
          threat: [],
          throttle: null,
          version: 1,
          exceptions_list: [],
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };
        expect(message.schema).toEqual(expected);
      }
    );
  });

  describe('exception_list', () => {
    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])(
      '[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, version, and exceptions_list] does validate - %s',
      (_, isRuleRegistryEnabled) => {
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
          note: '# some markdown',
          version: 1,
          exceptions_list: getListArrayMock(),
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };

        const schema = isRuleRegistryEnabled
          ? racAddPrepackagedRulesSchema
          : addPrepackagedRulesSchema;
        const decoded = schema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const message = pipe(checked, foldLeftRight);
        expect(getPaths(left(message.errors))).toEqual([]);
        const expected = {
          author: [],
          severity_mapping: [],
          risk_score_mapping: [],
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
          references: [],
          actions: [],
          enabled: false,
          false_positives: [],
          max_signals: DEFAULT_MAX_SIGNALS,
          tags: [],
          threat: [],
          throttle: null,
          version: 1,
          filters: [],
          exceptions_list: [
            {
              id: 'some_uuid',
              list_id: 'list_id_single',
              namespace_type: 'single',
              type: 'detection',
            },
            {
              id: 'endpoint_list',
              list_id: 'endpoint_list',
              namespace_type: 'agnostic',
              type: 'endpoint',
            },
          ],
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };
        expect(message.schema).toEqual(expected);
      }
    );

    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])(
      '[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, version, and empty exceptions_list] does validate - %s',
      (_, isRuleRegistryEnabled) => {
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
          exceptions_list: [],
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };

        const schema = isRuleRegistryEnabled
          ? racAddPrepackagedRulesSchema
          : addPrepackagedRulesSchema;
        const decoded = schema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const message = pipe(checked, foldLeftRight);
        expect(getPaths(left(message.errors))).toEqual([]);
        const expected = {
          author: [],
          severity_mapping: [],
          risk_score_mapping: [],
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
          references: [],
          actions: [],
          enabled: false,
          false_positives: [],
          max_signals: DEFAULT_MAX_SIGNALS,
          tags: [],
          threat: [],
          throttle: null,
          version: 1,
          filters: [],
          exceptions_list: [],
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };
        expect(message.schema).toEqual(expected);
      }
    );

    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])(
      'rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, version, and invalid exceptions_list] does NOT validate - %s',
      (_, isRuleRegistryEnabled) => {
        const payload: Omit<AddPrepackagedRulesSchema, 'exceptions_list'> & {
          exceptions_list: Array<{ id: string; namespace_type: string }>;
        } = {
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
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };

        const schema = isRuleRegistryEnabled
          ? racAddPrepackagedRulesSchema
          : addPrepackagedRulesSchema;
        const decoded = schema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const message = pipe(checked, foldLeftRight);
        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "undefined" supplied to "exceptions_list,list_id"',
          'Invalid value "undefined" supplied to "exceptions_list,type"',
          'Invalid value "not a namespace type" supplied to "exceptions_list,namespace_type"',
        ]);
        expect(message.schema).toEqual({});
      }
    );

    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])(
      '[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, version, and non-existent exceptions_list] does validate with empty exceptions_list - %s',
      (_, isRuleRegistryEnabled) => {
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
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };

        const schema = isRuleRegistryEnabled
          ? racAddPrepackagedRulesSchema
          : addPrepackagedRulesSchema;
        const decoded = schema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const message = pipe(checked, foldLeftRight);
        expect(getPaths(left(message.errors))).toEqual([]);
        const expected = {
          author: [],
          severity_mapping: [],
          risk_score_mapping: [],
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
          references: [],
          actions: [],
          enabled: false,
          false_positives: [],
          max_signals: DEFAULT_MAX_SIGNALS,
          tags: [],
          threat: [],
          throttle: null,
          version: 1,
          exceptions_list: [],
          filters: [],
          ...(isRuleRegistryEnabled ? { namespace: 'default' } : {}),
        };
        expect(message.schema).toEqual(expected);
      }
    );
  });

  describe('threat_mapping', () => {
    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])(
      'You can set a threat query, index, mapping, filters on a pre-packaged rule - %s',
      (_, isRuleRegistryEnabled) => {
        const payload = getAddPrepackagedThreatMatchRulesSchemaMock(isRuleRegistryEnabled);
        const schema = isRuleRegistryEnabled
          ? racAddPrepackagedRulesSchema
          : addPrepackagedRulesSchema;
        const decoded = schema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const message = pipe(checked, foldLeftRight);
        const expected = getAddPrepackagedThreatMatchRulesSchemaDecodedMock(isRuleRegistryEnabled);
        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(expected);
      }
    );
  });
});
