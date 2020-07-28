/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigSchema, ConfigType } from './config';
import { getConfigMock, getConfigMockDecoded } from './config.mock';

describe('config_schema', () => {
  test('it works with expected basic mock data set and defaults', () => {
    expect(ConfigSchema.validate(getConfigMock())).toEqual(getConfigMockDecoded());
  });

  test('it throws if given an invalid value', () => {
    const mock: Partial<ConfigType> & { madeUpValue: string } = {
      madeUpValue: 'something',
      ...getConfigMock(),
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[madeUpValue]: definition for this key is missing'
    );
  });

  test('it throws if the "maxImportPayloadBytes" value is 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      maxImportPayloadBytes: 0,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[maxImportPayloadBytes]: Value must be equal to or greater than [1].'
    );
  });

  test('it throws if the "maxImportPayloadBytes" value is less than 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      maxImportPayloadBytes: -1,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[maxImportPayloadBytes]: Value must be equal to or greater than [1].'
    );
  });

  test('it throws if the "importBufferSize" value is 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      importBufferSize: 0,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[importBufferSize]: Value must be equal to or greater than [1].'
    );
  });

  test('it throws if the "importBufferSize" value is less than 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      importBufferSize: -1,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[importBufferSize]: Value must be equal to or greater than [1].'
    );
  });
});
