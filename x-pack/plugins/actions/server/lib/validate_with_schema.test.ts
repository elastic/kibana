/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { validateParams, validateConfig, validateSecrets } from './validate_with_schema';
import { ActionType, ExecutorType } from '../types';

const executor: ExecutorType = async options => {
  return { status: 'ok', actionId: options.actionId };
};

test('should validate when there are no validators', () => {
  const actionType: ActionType = { id: 'foo', name: 'bar', executor };
  const testValue = { any: ['old', 'thing'] };

  const result = validateConfig(actionType, testValue);
  expect(result).toEqual(testValue);
});

test('should validate when there are no individual validators', () => {
  const actionType: ActionType = { id: 'foo', name: 'bar', executor, validate: {} };

  let result;
  const testValue = { any: ['old', 'thing'] };

  result = validateParams(actionType, testValue);
  expect(result).toEqual(testValue);

  result = validateConfig(actionType, testValue);
  expect(result).toEqual(testValue);

  result = validateSecrets(actionType, testValue);
  expect(result).toEqual(testValue);
});

test('should validate when validators return incoming value', () => {
  const selfValidator = { validate: (value: any) => value };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    executor,
    validate: {
      params: selfValidator,
      config: selfValidator,
      secrets: selfValidator,
    },
  };

  let result;
  const testValue = { any: ['old', 'thing'] };

  result = validateParams(actionType, testValue);
  expect(result).toEqual(testValue);

  result = validateConfig(actionType, testValue);
  expect(result).toEqual(testValue);

  result = validateSecrets(actionType, testValue);
  expect(result).toEqual(testValue);
});

test('should validate when validators return different values', () => {
  const returnedValue: any = { something: { shaped: 'differently' } };
  const selfValidator = { validate: (value: any) => returnedValue };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    executor,
    validate: {
      params: selfValidator,
      config: selfValidator,
      secrets: selfValidator,
    },
  };

  let result;
  const testValue = { any: ['old', 'thing'] };

  result = validateParams(actionType, testValue);
  expect(result).toEqual(returnedValue);

  result = validateConfig(actionType, testValue);
  expect(result).toEqual(returnedValue);

  result = validateSecrets(actionType, testValue);
  expect(result).toEqual(returnedValue);
});

test('should throw with expected error when validators fail', () => {
  const erroringValidator = {
    validate: (value: any) => {
      throw new Error('test error');
    },
  };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    executor,
    validate: {
      params: erroringValidator,
      config: erroringValidator,
      secrets: erroringValidator,
    },
  };

  const testValue = { any: ['old', 'thing'] };

  expect(() => validateParams(actionType, testValue)).toThrowErrorMatchingInlineSnapshot(
    `"error validating action params: test error"`
  );

  expect(() => validateConfig(actionType, testValue)).toThrowErrorMatchingInlineSnapshot(
    `"error validating action type config: test error"`
  );

  expect(() => validateSecrets(actionType, testValue)).toThrowErrorMatchingInlineSnapshot(
    `"error validating action type secrets: test error"`
  );
});

test('should work with @kbn/config-schema', () => {
  const testSchema = schema.object({ foo: schema.string() });
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    executor,
    validate: {
      params: testSchema,
      config: testSchema,
      secrets: testSchema,
    },
  };

  const result = validateParams(actionType, { foo: 'bar' });
  expect(result).toEqual({ foo: 'bar' });

  expect(() => validateParams(actionType, { bar: 2 })).toThrowErrorMatchingInlineSnapshot(
    `"error validating action params: [foo]: expected value of type [string] but got [undefined]"`
  );
});
