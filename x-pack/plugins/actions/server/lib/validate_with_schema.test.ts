/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  validateParams,
  validateConfig,
  validateSecrets,
  validateConnector,
} from './validate_with_schema';
import { ActionType, ExecutorType } from '../types';

const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

test('should validate when there are no validators', () => {
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    executor,
  };
  const testValue = { any: ['old', 'thing'] };

  const result = validateConfig(actionType, testValue);
  expect(result).toEqual(testValue);
});

test('should validate when there are no individual validators', () => {
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    executor,
    validate: {},
  };

  let result;
  const testValue = { any: ['old', 'thing'] };

  result = validateParams(actionType, testValue);
  expect(result).toEqual(testValue);

  result = validateConfig(actionType, testValue);
  expect(result).toEqual(testValue);

  result = validateSecrets(actionType, testValue);
  expect(result).toEqual(testValue);

  result = validateConnector(actionType, { config: testValue });
  expect(result).toBeNull();
});

test('should validate when validators return incoming value', () => {
  const selfValidator = { validate: (value: Record<string, unknown>) => value };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    executor,
    validate: {
      params: selfValidator,
      config: selfValidator,
      secrets: selfValidator,
      connector: () => null,
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

  result = validateConnector(actionType, { config: testValue, secrets: { user: 'test' } });
  expect(result).toBeNull();
});

test('should validate when validators return different values', () => {
  const returnedValue = { something: { shaped: 'differently' } };
  const selfValidator = { validate: () => returnedValue };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    executor,
    validate: {
      params: selfValidator,
      config: selfValidator,
      secrets: selfValidator,
      connector: () => null,
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

  result = validateConnector(actionType, { config: testValue, secrets: { user: 'test' } });
  expect(result).toBeNull();
});

test('should throw with expected error when validators fail', () => {
  const erroringValidator = {
    validate: () => {
      throw new Error('test error');
    },
  };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    executor,
    validate: {
      params: erroringValidator,
      config: erroringValidator,
      secrets: erroringValidator,
      connector: () => 'test error',
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

  expect(() =>
    validateConnector(actionType, { config: testValue, secrets: { user: 'test' } })
  ).toThrowErrorMatchingInlineSnapshot(`"error validating action type connector: test error"`);
});

test('should work with @kbn/config-schema', () => {
  const testSchema = schema.object({ foo: schema.string() });
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    executor,
    validate: {
      params: testSchema,
      config: testSchema,
      secrets: testSchema,
      connector: () => null,
    },
  };

  const result = validateParams(actionType, { foo: 'bar' });
  expect(result).toEqual({ foo: 'bar' });

  expect(() => validateParams(actionType, { bar: 2 })).toThrowErrorMatchingInlineSnapshot(
    `"error validating action params: [foo]: expected value of type [string] but got [undefined]"`
  );
});

describe('validateConnectors', () => {
  const testValue = { any: ['old', 'thing'] };
  const selfValidator = { validate: (value: Record<string, unknown>) => value };
  const actionType: ActionType = {
    id: 'foo',
    name: 'bar',
    minimumLicenseRequired: 'basic',
    executor,
    validate: {
      params: selfValidator,
      config: selfValidator,
      secrets: selfValidator,
      connector: () => null,
    },
  };

  test('should throw error when connector config is null', () => {
    expect(() =>
      validateConnector(actionType, { config: null, secrets: { user: 'test' } })
    ).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: config must be defined"`
    );
  });

  test('should throw error when connector config is undefined', () => {
    expect(() =>
      validateConnector(actionType, { config: undefined, secrets: { user: 'test' } })
    ).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: config must be defined"`
    );
  });

  test('should throw error when connector secrets is null', () => {
    expect(() =>
      validateConnector(actionType, { config: testValue, secrets: null })
    ).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: secrets must be defined"`
    );
  });

  test('should throw error when connector secrets is undefined', () => {
    expect(() =>
      validateConnector(actionType, { config: testValue, secrets: undefined })
    ).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: secrets must be defined"`
    );
  });
});
