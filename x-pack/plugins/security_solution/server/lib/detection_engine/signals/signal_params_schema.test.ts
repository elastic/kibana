/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { signalParamsSchema, SignalParamsSchema } from './signal_params_schema';
import {
  getSignalParamsSchemaDecodedMock,
  getSignalParamsSchemaMock,
} from './signal_params_schema.mock';
import { DEFAULT_MAX_SIGNALS } from '../../../../common/constants';

describe('signal_params_schema', () => {
  test('it works with expected basic mock data set', () => {
    const schema = signalParamsSchema();
    expect(schema.validate(getSignalParamsSchemaMock())).toEqual(
      getSignalParamsSchemaDecodedMock()
    );
  });

  test('it works on older lists data structures if they exist as an empty array', () => {
    const schema = signalParamsSchema();
    const mock: Partial<SignalParamsSchema> = { lists: [], ...getSignalParamsSchemaMock() };
    const expected: Partial<SignalParamsSchema> = {
      lists: [],
      ...getSignalParamsSchemaDecodedMock(),
    };
    expect(schema.validate(mock)).toEqual(expected);
  });

  test('it works on older exceptions_list data structures if they exist as an empty array', () => {
    const schema = signalParamsSchema();
    const mock: Partial<SignalParamsSchema> = {
      exceptions_list: [],
      ...getSignalParamsSchemaMock(),
    };
    const expected: Partial<SignalParamsSchema> = {
      exceptions_list: [],
      ...getSignalParamsSchemaDecodedMock(),
    };
    expect(schema.validate(mock)).toEqual(expected);
  });

  test('it throws if given an invalid value', () => {
    const schema = signalParamsSchema();
    const mock: Partial<SignalParamsSchema> & { madeUpValue: string } = {
      madeUpValue: 'something',
      ...getSignalParamsSchemaMock(),
    };
    expect(() => schema.validate(mock)).toThrow(
      '[madeUpValue]: definition for this key is missing'
    );
  });

  test('if risk score is a string then it will be converted into a number before being inserted as data', () => {
    const schema = signalParamsSchema();
    const mock: Omit<Partial<SignalParamsSchema>, 'riskScore'> & { riskScore: string } = {
      ...getSignalParamsSchemaMock(),
      riskScore: '5',
    };
    expect(schema.validate(mock).riskScore).toEqual(5);
    expect(typeof schema.validate(mock).riskScore).toEqual('number');
  });

  test('if risk score is a number then it will work as a number', () => {
    const schema = signalParamsSchema();
    const mock: Partial<SignalParamsSchema> = {
      ...getSignalParamsSchemaMock(),
      riskScore: 5,
    };
    expect(schema.validate(mock).riskScore).toEqual(5);
    expect(typeof schema.validate(mock).riskScore).toEqual('number');
  });

  test('maxSignals will default to "DEFAULT_MAX_SIGNALS" if not set', () => {
    const schema = signalParamsSchema();
    const { maxSignals, ...withoutMockData } = getSignalParamsSchemaMock();
    expect(schema.validate(withoutMockData).maxSignals).toEqual(DEFAULT_MAX_SIGNALS);
  });

  test('version will default to "1" if not set', () => {
    const schema = signalParamsSchema();
    const { version, ...withoutVersion } = getSignalParamsSchemaMock();
    expect(schema.validate(withoutVersion).version).toEqual(1);
  });

  test('references will default to an empty array if not set', () => {
    const schema = signalParamsSchema();
    const { references, ...withoutReferences } = getSignalParamsSchemaMock();
    expect(schema.validate(withoutReferences).references).toEqual([]);
  });

  test('immutable will default to false if not set', () => {
    const schema = signalParamsSchema();
    const { immutable, ...withoutImmutable } = getSignalParamsSchemaMock();
    expect(schema.validate(withoutImmutable).immutable).toEqual(false);
  });

  test('falsePositives will default to an empty array if not set', () => {
    const schema = signalParamsSchema();
    const { falsePositives, ...withoutFalsePositives } = getSignalParamsSchemaMock();
    expect(schema.validate(withoutFalsePositives).falsePositives).toEqual([]);
  });
});
