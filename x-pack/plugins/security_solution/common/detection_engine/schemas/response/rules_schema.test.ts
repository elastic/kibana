/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';

import {
  rulesSchema,
  RulesSchema,
  checkTypeDependents,
  getDependents,
  addSavedId,
  addQueryFields,
  addTimelineTitle,
  addMlFields,
} from './rules_schema';
import { exactCheck } from '../../../exact_check';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { TypeAndTimelineOnly } from './type_timeline_only_schema';
import { getRulesSchemaMock, getRulesMlSchemaMock } from './rules_schema.mocks';
import { ListArray } from '../types/lists';

export const ANCHOR_DATE = '2020-02-20T03:57:54.037Z';

describe('rules_schema', () => {
  test('it should validate a type of "query" without anything extra', () => {
    const payload = getRulesSchemaMock();

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getRulesSchemaMock();

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "query" when it has extra data', () => {
    const payload: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate invalid_data for the type', () => {
    const payload: Omit<RulesSchema, 'type'> & { type: string } = getRulesSchemaMock();
    payload.type = 'invalid_data';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "invalid_data" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "query" with a saved_id together', () => {
    const payload = getRulesSchemaMock();
    payload.type = 'query';
    payload.saved_id = 'save id 123';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "saved_id"']);
    expect(message.schema).toEqual({});
  });

  test('it should validate a type of "saved_query" with a "saved_id" dependent', () => {
    const payload = getRulesSchemaMock();
    payload.type = 'saved_query';
    payload.saved_id = 'save id 123';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getRulesSchemaMock();

    expected.type = 'saved_query';
    expected.saved_id = 'save id 123';

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
    const payload = getRulesSchemaMock();
    payload.type = 'saved_query';
    delete payload.saved_id;

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "saved_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" when it has extra data', () => {
    const payload: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    payload.type = 'saved_query';
    payload.saved_id = 'save id 123';
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should validate a type of "timeline_id" if there is a "timeline_title" dependent', () => {
    const payload = getRulesSchemaMock();
    payload.timeline_id = 'some timeline id';
    payload.timeline_title = 'some timeline title';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getRulesSchemaMock();
    expected.timeline_id = 'some timeline id';
    expected.timeline_title = 'some timeline title';

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "timeline_id" if there is "timeline_title" dependent when it has extra invalid data', () => {
    const payload: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    payload.timeline_id = 'some timeline id';
    payload.timeline_title = 'some timeline title';
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "timeline_id" if there is NOT a "timeline_title" dependent', () => {
    const payload = getRulesSchemaMock();
    payload.timeline_id = 'some timeline id';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "timeline_title"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "timeline_title" if there is NOT a "timeline_id" dependent', () => {
    const payload = getRulesSchemaMock();
    payload.timeline_title = 'some timeline title';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_title" but there is NOT a "timeline_id"', () => {
    const payload = getRulesSchemaMock();
    payload.saved_id = 'some saved id';
    payload.type = 'saved_query';
    payload.timeline_title = 'some timeline title';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_id" but there is NOT a "timeline_title"', () => {
    const payload = getRulesSchemaMock();
    payload.saved_id = 'some saved id';
    payload.type = 'saved_query';
    payload.timeline_id = 'some timeline id';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "timeline_title"',
    ]);
    expect(message.schema).toEqual({});
  });

  describe('checkTypeDependents', () => {
    test('it should validate a type of "query" without anything extra', () => {
      const payload = getRulesSchemaMock();

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesSchemaMock();

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate invalid_data for the type', () => {
      const payload: Omit<RulesSchema, 'type'> & { type: string } = getRulesSchemaMock();
      payload.type = 'invalid_data';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "invalid_data" supplied to "type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "query" with a saved_id together', () => {
      const payload = getRulesSchemaMock();
      payload.type = 'query';
      payload.saved_id = 'save id 123';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "saved_id"']);
      expect(message.schema).toEqual({});
    });

    test('it should validate a type of "saved_query" with a "saved_id" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.type = 'saved_query';
      payload.saved_id = 'save id 123';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesSchemaMock();

      expected.type = 'saved_query';
      expected.saved_id = 'save id 123';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.type = 'saved_query';
      delete payload.saved_id;

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "saved_id"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "saved_query" when it has extra data', () => {
      const payload: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
      payload.type = 'saved_query';
      payload.saved_id = 'save id 123';
      payload.invalid_extra_data = 'invalid_extra_data';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
      expect(message.schema).toEqual({});
    });

    test('it should validate a type of "timeline_id" if there is a "timeline_title" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.timeline_id = 'some timeline id';
      payload.timeline_title = 'some timeline title';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesSchemaMock();
      expected.timeline_id = 'some timeline id';
      expected.timeline_title = 'some timeline title';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "timeline_id" if there is "timeline_title" dependent when it has extra invalid data', () => {
      const payload: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
      payload.timeline_id = 'some timeline id';
      payload.timeline_title = 'some timeline title';
      payload.invalid_extra_data = 'invalid_extra_data';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "timeline_id" if there is NOT a "timeline_title" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.timeline_id = 'some timeline id';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "timeline_title"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "timeline_title" if there is NOT a "timeline_id" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.timeline_title = 'some timeline title';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_title" but there is NOT a "timeline_id"', () => {
      const payload = getRulesSchemaMock();
      payload.saved_id = 'some saved id';
      payload.type = 'saved_query';
      payload.timeline_title = 'some timeline title';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_id" but there is NOT a "timeline_title"', () => {
      const payload = getRulesSchemaMock();
      payload.saved_id = 'some saved id';
      payload.type = 'saved_query';
      payload.timeline_id = 'some timeline id';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "timeline_title"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('getDependents', () => {
    test('it should validate a type of "query" without anything extra', () => {
      const payload = getRulesSchemaMock();

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesSchemaMock();

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate invalid_data for the type', () => {
      const payload: Omit<RulesSchema, 'type'> & { type: string } = getRulesSchemaMock();
      payload.type = 'invalid_data';

      const dependents = getDependents((payload as unknown) as TypeAndTimelineOnly);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "invalid_data" supplied to "type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "query" with a saved_id together', () => {
      const payload = getRulesSchemaMock();
      payload.type = 'query';
      payload.saved_id = 'save id 123';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "saved_id"']);
      expect(message.schema).toEqual({});
    });

    test('it should validate a type of "saved_query" with a "saved_id" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.type = 'saved_query';
      payload.saved_id = 'save id 123';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesSchemaMock();

      expected.type = 'saved_query';
      expected.saved_id = 'save id 123';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.type = 'saved_query';
      delete payload.saved_id;

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "saved_id"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "saved_query" when it has extra data', () => {
      const payload: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
      payload.type = 'saved_query';
      payload.saved_id = 'save id 123';
      payload.invalid_extra_data = 'invalid_extra_data';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
      expect(message.schema).toEqual({});
    });

    test('it should validate a type of "timeline_id" if there is a "timeline_title" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.timeline_id = 'some timeline id';
      payload.timeline_title = 'some timeline title';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesSchemaMock();
      expected.timeline_id = 'some timeline id';
      expected.timeline_title = 'some timeline title';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "timeline_id" if there is "timeline_title" dependent when it has extra invalid data', () => {
      const payload: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
      payload.timeline_id = 'some timeline id';
      payload.timeline_title = 'some timeline title';
      payload.invalid_extra_data = 'invalid_extra_data';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "timeline_id" if there is NOT a "timeline_title" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.timeline_id = 'some timeline id';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "timeline_title"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "timeline_title" if there is NOT a "timeline_id" dependent', () => {
      const payload = getRulesSchemaMock();
      payload.timeline_title = 'some timeline title';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_title" but there is NOT a "timeline_id"', () => {
      const payload = getRulesSchemaMock();
      payload.saved_id = 'some saved id';
      payload.type = 'saved_query';
      payload.timeline_title = 'some timeline title';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_id" but there is NOT a "timeline_title"', () => {
      const payload = getRulesSchemaMock();
      payload.saved_id = 'some saved id';
      payload.type = 'saved_query';
      payload.timeline_id = 'some timeline id';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "timeline_title"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it validates an ML rule response', () => {
      const payload = getRulesMlSchemaMock();

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesMlSchemaMock();

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it rejects a response with both ML and query properties', () => {
      const payload = {
        ...getRulesSchemaMock(),
        ...getRulesMlSchemaMock(),
      };

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "query,language"']);
      expect(message.schema).toEqual({});
    });
  });

  describe('addSavedId', () => {
    test('should return empty array if not given a type of "saved_query"', () => {
      const emptyArray = addSavedId({ type: 'query' });
      const expected: t.Mixed[] = [];
      expect(emptyArray).toEqual(expected);
    });

    test('should array of size 1 given a "saved_query"', () => {
      const array = addSavedId({ type: 'saved_query' });
      expect(array.length).toEqual(1);
    });
  });

  describe('addTimelineTitle', () => {
    test('should return empty array if not given a timeline_id', () => {
      const emptyArray = addTimelineTitle({ type: 'query' });
      const expected: t.Mixed[] = [];
      expect(emptyArray).toEqual(expected);
    });

    test('should array of size 2 given a "timeline_id" that is not null', () => {
      const array = addTimelineTitle({ type: 'query', timeline_id: 'some id' });
      expect(array.length).toEqual(2);
    });
  });

  describe('addQueryFields', () => {
    test('should return empty array if type is not "query"', () => {
      const fields = addQueryFields({ type: 'machine_learning' });
      const expected: t.Mixed[] = [];
      expect(fields).toEqual(expected);
    });

    test('should return two fields for a rule of type "query"', () => {
      const fields = addQueryFields({ type: 'query' });
      expect(fields.length).toEqual(2);
    });

    test('should return two fields for a rule of type "saved_query"', () => {
      const fields = addQueryFields({ type: 'saved_query' });
      expect(fields.length).toEqual(2);
    });
  });

  describe('addMlFields', () => {
    test('should return empty array if type is not "machine_learning"', () => {
      const fields = addMlFields({ type: 'query' });
      const expected: t.Mixed[] = [];
      expect(fields).toEqual(expected);
    });

    test('should return two fields for a rule of type "machine_learning"', () => {
      const fields = addMlFields({ type: 'machine_learning' });
      expect(fields.length).toEqual(2);
    });
  });

  describe('exceptions_list', () => {
    test('it should validate an empty array for "exceptions_list"', () => {
      const payload = getRulesSchemaMock();
      payload.exceptions_list = [];
      const decoded = rulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesSchemaMock();
      expected.exceptions_list = [];
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate when "exceptions_list" is not expected type', () => {
      const payload: Omit<RulesSchema, 'exceptions_list'> & {
        exceptions_list?: string;
      } = { ...getRulesSchemaMock(), exceptions_list: 'invalid_data' };

      const decoded = rulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "invalid_data" supplied to "exceptions_list"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should default to empty array if "exceptions_list" is undefined ', () => {
      const payload: Omit<RulesSchema, 'exceptions_list'> & {
        exceptions_list?: ListArray;
      } = getRulesSchemaMock();
      payload.exceptions_list = undefined;

      const decoded = rulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual({ ...payload, exceptions_list: [] });
    });
  });
});
