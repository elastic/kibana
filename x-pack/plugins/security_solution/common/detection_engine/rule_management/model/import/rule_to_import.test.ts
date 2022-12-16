/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { getListArrayMock } from '../../../schemas/types/lists.mock';
import { RuleToImport } from './rule_to_import';
import {
  getImportRulesSchemaMock,
  getImportThreatMatchRulesSchemaMock,
} from './rule_to_import.mock';

describe('RuleToImport', () => {
  test('empty objects do not validate', () => {
    const payload: Partial<RuleToImport> = {};

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "description"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "risk_score"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "name"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "severity"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "rule_id"'
    );
    expect(message.schema).toEqual({});
  });

  test('made up values do not validate', () => {
    const payload: RuleToImport & { madeUp: string } = {
      ...getImportRulesSchemaMock(),
      madeUp: 'hi',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });

  test('[rule_id] does not validate', () => {
    const payload: Partial<RuleToImport> = {
      rule_id: 'rule-1',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "description"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "risk_score"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "name"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "severity"'
    );
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description] does not validate', () => {
    const payload: Partial<RuleToImport> = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "risk_score"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "name"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "severity"'
    );
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from] does not validate', () => {
    const payload: Partial<RuleToImport> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "risk_score"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "name"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "severity"'
    );
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to] does not validate', () => {
    const payload: Partial<RuleToImport> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "risk_score"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "name"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "severity"'
    );
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name] does not validate', () => {
    const payload: Partial<RuleToImport> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "risk_score"'
    );
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "severity"'
    );
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity] does not validate', () => {
    const payload: Partial<RuleToImport> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "risk_score"'
    );
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type] does not validate', () => {
    const payload: Partial<RuleToImport> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does not validate', () => {
    const payload: Partial<RuleToImport> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, interval, index] does not validate', () => {
    const payload: Partial<RuleToImport> = {
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

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, query, index, interval] does validate', () => {
    const payload: RuleToImport = {
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
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    const payload: Partial<RuleToImport> = {
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
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score] does validate', () => {
    const payload: RuleToImport = {
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
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does validate', () => {
    const payload: RuleToImport = {
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

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score] does validate', () => {
    const payload: RuleToImport = {
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
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index] does validate', () => {
    const payload: RuleToImport = {
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
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You can send in an empty array to threat', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      threat: [],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate', () => {
    const payload: RuleToImport = {
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
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('allows references to be sent as valid', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      references: ['index-1'],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('defaults references to an array if it is not sent in', () => {
    const { references, ...noReferences } = getImportRulesSchemaMock();
    const decoded = RuleToImport.decode(noReferences);
    const checked = exactCheck(noReferences, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('references cannot be numbers', () => {
    const payload: Omit<RuleToImport, 'references'> & { references: number[] } = {
      ...getImportRulesSchemaMock(),
      references: [5],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "references"']);
    expect(message.schema).toEqual({});
  });

  test('indexes cannot be numbers', () => {
    const payload: Omit<RuleToImport, 'index'> & { index: number[] } = {
      ...getImportRulesSchemaMock(),
      index: [5],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "index"']);
    expect(message.schema).toEqual({});
  });

  test('defaults interval to 5 min', () => {
    const { interval, ...noInterval } = getImportRulesSchemaMock();
    const payload: RuleToImport = {
      ...noInterval,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('defaults max signals to 100', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { max_signals, ...noMaxSignals } = getImportRulesSchemaMock();
    const payload: RuleToImport = {
      ...noMaxSignals,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('saved_query type can have filters with it', () => {
    const payload = {
      ...getImportRulesSchemaMock(),
      filters: [],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('filters cannot be a string', () => {
    const payload: Omit<RuleToImport, 'filters'> & { filters: string } = {
      ...getImportRulesSchemaMock(),
      filters: 'some string',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "filters"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('language validates with kuery', () => {
    const payload = {
      ...getImportRulesSchemaMock(),
      language: 'kuery',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('language validates with lucene', () => {
    const payload = {
      ...getImportRulesSchemaMock(),
      language: 'lucene',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('language does not validate with something made up', () => {
    const payload: Omit<RuleToImport, 'language'> & { language: string } = {
      ...getImportRulesSchemaMock(),
      language: 'something-made-up',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "something-made-up" supplied to "language"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be negative', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      max_signals: -1,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "max_signals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be zero', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      max_signals: 0,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "0" supplied to "max_signals"']);
    expect(message.schema).toEqual({});
  });

  test('max_signals can be 1', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      max_signals: 1,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You can optionally send in an array of tags', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      tags: ['tag_1', 'tag_2'],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You cannot send in an array of tags that are numbers', () => {
    const payload: Omit<RuleToImport, 'tags'> & { tags: number[] } = {
      ...getImportRulesSchemaMock(),
      tags: [0, 1, 2],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "tags"',
      'Invalid value "1" supplied to "tags"',
      'Invalid value "2" supplied to "tags"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "framework"', () => {
    const payload: Omit<RuleToImport, 'threat'> & {
      threat: Array<Partial<Omit<RuleToImport['threat'], 'framework'>>>;
    } = {
      ...getImportRulesSchemaMock(),
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

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,framework"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "tactic"', () => {
    const payload: Omit<RuleToImport, 'threat'> & {
      threat: Array<Partial<Omit<RuleToImport['threat'], 'tactic'>>>;
    } = {
      ...getImportRulesSchemaMock(),
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

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,tactic"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You can send in an array of threat that are missing "technique"', () => {
    const payload: Omit<RuleToImport, 'threat'> & {
      threat: Array<Partial<Omit<RuleToImport['threat'], 'technique'>>>;
    } = {
      ...getImportRulesSchemaMock(),
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

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You can optionally send in an array of false positives', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      false_positives: ['false_1', 'false_2'],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    const payload: Omit<RuleToImport, 'false_positives'> & { false_positives: number[] } = {
      ...getImportRulesSchemaMock(),
      false_positives: [5, 4],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "false_positives"',
      'Invalid value "4" supplied to "false_positives"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the immutable to a number when trying to create a rule', () => {
    const payload: Omit<RuleToImport, 'immutable'> & { immutable: number } = {
      ...getImportRulesSchemaMock(),
      immutable: 5,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "immutable"']);
    expect(message.schema).toEqual({});
  });

  test('You can optionally set the immutable to be false', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      immutable: false,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You cannot set the immutable to be true', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      immutable: true,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "true" supplied to "immutable"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the immutable to be a number', () => {
    const payload: Omit<RuleToImport, 'immutable'> & { immutable: number } = {
      ...getImportRulesSchemaMock(),
      immutable: 5,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "immutable"']);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the risk_score to 101', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      risk_score: 101,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "101" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the risk_score to -1', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      risk_score: -1,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "risk_score"']);
    expect(message.schema).toEqual({});
  });

  test('You can set the risk_score to 0', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      risk_score: 0,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You can set the risk_score to 100', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      risk_score: 100,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You can set meta to any object you want', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You cannot create meta as a string', () => {
    const payload: Omit<RuleToImport, 'meta'> & { meta: string } = {
      ...getImportRulesSchemaMock(),
      meta: 'should not work',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "should not work" supplied to "meta"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('rule_id is required and you cannot get by with just id', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612',
    };
    // @ts-expect-error
    delete payload.rule_id;

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rule_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it validates with created_at, updated_at, created_by, updated_by values', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      created_at: '2020-01-09T06:15:24.749Z',
      updated_at: '2020-01-09T06:15:24.749Z',
      created_by: 'Braden Hassanabad',
      updated_by: 'Evan Hassanabad',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('it does not validate with epoch strings for created_at', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      created_at: '1578550728650',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1578550728650" supplied to "created_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it does not validate with epoch strings for updated_at', () => {
    const payload: RuleToImport = {
      ...getImportRulesSchemaMock(),
      updated_at: '1578550728650',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1578550728650" supplied to "updated_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('The default for "from" will be "now-6m"', () => {
    const { from, ...noFrom } = getImportRulesSchemaMock();
    const payload: RuleToImport = {
      ...noFrom,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('The default for "to" will be "now"', () => {
    const { to, ...noTo } = getImportRulesSchemaMock();
    const payload: RuleToImport = {
      ...noTo,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload: Omit<RuleToImport, 'severity'> & { severity: string } = {
      ...getImportRulesSchemaMock(),
      severity: 'junk',
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "junk" supplied to "severity"']);
    expect(message.schema).toEqual({});
  });

  test('The default for "actions" will be an empty array', () => {
    const { actions, ...noActions } = getImportRulesSchemaMock();
    const payload: RuleToImport = {
      ...noActions,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  test('You cannot send in an array of actions that are missing "group"', () => {
    const payload: Omit<RuleToImport['actions'], 'group'> = {
      ...getImportRulesSchemaMock(),
      actions: [{ id: 'id', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,group"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    const payload: Omit<RuleToImport['actions'], 'id'> = {
      ...getImportRulesSchemaMock(),
      actions: [{ group: 'group', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "action_type_id"', () => {
    const payload: Omit<RuleToImport['actions'], 'action_type_id'> = {
      ...getImportRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', params: {} }],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    const payload: Omit<RuleToImport['actions'], 'params'> = {
      ...getImportRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', action_type_id: 'action_type_id' }],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,params"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are including "actionTypeId"', () => {
    const payload: Omit<RuleToImport['actions'], 'actions'> = {
      ...getImportRulesSchemaMock(),
      actions: [
        {
          group: 'group',
          id: 'id',
          actionTypeId: 'actionTypeId',
          params: {},
        },
      ],
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('The default for "throttle" will be null', () => {
    const { throttle, ...noThrottle } = getImportRulesSchemaMock();
    const payload: RuleToImport = {
      ...noThrottle,
    };

    const decoded = RuleToImport.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
  });

  describe('note', () => {
    test('You can set note to a string', () => {
      const payload: RuleToImport = {
        ...getImportRulesSchemaMock(),
        note: '# documentation markdown here',
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });

    test('You can set note to an empty string', () => {
      const payload: RuleToImport = {
        ...getImportRulesSchemaMock(),
        note: '',
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });

    test('You cannot create note as an object', () => {
      const payload: Omit<RuleToImport, 'note'> & { note: {} } = {
        ...getImportRulesSchemaMock(),
        note: {
          somethingHere: 'something else',
        },
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "{"somethingHere":"something else"}" supplied to "note"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note] does validate', () => {
      const payload: RuleToImport = {
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
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and exceptions_list] does validate', () => {
      const payload: RuleToImport = {
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
        exceptions_list: getListArrayMock(),
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and empty exceptions_list] does validate', () => {
      const payload: RuleToImport = {
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
        exceptions_list: [],
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });

    test('rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and invalid exceptions_list] does NOT validate', () => {
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
        exceptions_list: [{ id: 'uuid_here', namespace_type: 'not a namespace type' }],
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "exceptions_list,list_id"',
        'Invalid value "undefined" supplied to "exceptions_list,type"',
        'Invalid value "not a namespace type" supplied to "exceptions_list,namespace_type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: RuleToImport = {
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
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });
  });

  describe('threat_mapping', () => {
    test('You can set a threat query, index, mapping, filters on an imported rule', () => {
      const payload = getImportThreatMatchRulesSchemaMock();
      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });
  });

  describe('data_view_id', () => {
    test('Defined data_view_id and empty index does validate', () => {
      const payload: RuleToImport = {
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        query: 'some query',
        data_view_id: 'logs-*',
        index: [],
        interval: '5m',
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });

    // Both can be defined, but if a data_view_id is defined, rule will use that one
    test('Defined data_view_id and index does validate', () => {
      const payload: RuleToImport = {
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        query: 'some query',
        data_view_id: 'logs-*',
        index: ['auditbeat-*'],
        interval: '5m',
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
    });

    test('data_view_id cannot be a number', () => {
      const payload: Omit<RuleToImport, 'data_view_id'> & { data_view_id: number } = {
        ...getImportRulesSchemaMock(),
        data_view_id: 5,
      };

      const decoded = RuleToImport.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "5" supplied to "data_view_id"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
