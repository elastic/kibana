/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';

import {
  checkTypeDependents,
  getDependents,
  addSavedId,
  addTimelineTitle,
  addQueryFields,
  addMlFields,
} from './check_type_dependents';
import { getBaseResponsePayload, getMlRuleResponsePayload } from './__mocks__/utils';
import { left } from 'fp-ts/lib/Either';
import { RulesSchema } from './rules_schema';
import { TypeAndTimelineOnly } from './type_timeline_only_schema';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../../feature_flags';
import { foldLeftRight, getPaths } from '../../../../../utils/build_validation/__mocks__/utils';
import { exactCheck } from '../../../../../utils/build_validation/exact_check';

describe('check_type_dependents', () => {
  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  describe('checkTypeDependents', () => {
    test('it should validate a type of "query" without anything extra', () => {
      const payload = getBaseResponsePayload();

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getBaseResponsePayload();

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate invalid_data for the type', () => {
      const payload: Omit<RulesSchema, 'type'> & { type: string } = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
      payload.type = 'query';
      payload.saved_id = 'save id 123';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "saved_id"']);
      expect(message.schema).toEqual({});
    });

    test('it should validate a type of "saved_query" with a "saved_id" dependent', () => {
      const payload = getBaseResponsePayload();
      payload.type = 'saved_query';
      payload.saved_id = 'save id 123';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getBaseResponsePayload();

      expected.type = 'saved_query';
      expected.saved_id = 'save id 123';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
      const payload = getBaseResponsePayload();
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
      const payload: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
      payload.timeline_id = 'some timeline id';
      payload.timeline_title = 'some timeline title';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getBaseResponsePayload();
      expected.timeline_id = 'some timeline id';
      expected.timeline_title = 'some timeline title';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "timeline_id" if there is "timeline_title" dependent when it has extra invalid data', () => {
      const payload: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
      payload.timeline_title = 'some timeline title';

      const decoded = checkTypeDependents(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_title" but there is NOT a "timeline_id"', () => {
      const payload = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getBaseResponsePayload();

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate invalid_data for the type', () => {
      const payload: Omit<RulesSchema, 'type'> & { type: string } = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
      payload.type = 'saved_query';
      payload.saved_id = 'save id 123';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getBaseResponsePayload();

      expected.type = 'saved_query';
      expected.saved_id = 'save id 123';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
      const payload = getBaseResponsePayload();
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
      const payload: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
      payload.timeline_id = 'some timeline id';
      payload.timeline_title = 'some timeline title';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getBaseResponsePayload();
      expected.timeline_id = 'some timeline id';
      expected.timeline_title = 'some timeline title';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "timeline_id" if there is "timeline_title" dependent when it has extra invalid data', () => {
      const payload: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
      payload.timeline_title = 'some timeline title';

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_title" but there is NOT a "timeline_id"', () => {
      const payload = getBaseResponsePayload();
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
      const payload = getBaseResponsePayload();
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
      const payload = getMlRuleResponsePayload();

      const dependents = getDependents(payload);
      const decoded = dependents.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getMlRuleResponsePayload();

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it rejects a response with both ML and query properties', () => {
      const payload = {
        ...getBaseResponsePayload(),
        ...getMlRuleResponsePayload(),
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
});
