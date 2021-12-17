/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { apiService } from './utils';
import { getDynamicSettings } from './dynamic_settings';
import { HttpSetup } from 'src/core/public';
import { DynamicSettings } from '../../../common/runtime_types/dynamic_settings';

describe('Dynamic Settings API', () => {
  let fetchMock: jest.SpyInstance<Partial<unknown>>;
  const defaultResponse: DynamicSettings & { _inspect: never[] } = {
    heartbeatIndices: 'heartbeat-8*',
    certAgeThreshold: 1,
    certExpirationThreshold: 1337,
    defaultConnectors: [],
    _inspect: [],
  };

  beforeEach(() => {
    apiService.http = {
      get: jest.fn(),
      fetch: jest.fn(),
    } as unknown as HttpSetup;

    apiService.addInspectorRequest = jest.fn();

    fetchMock = jest.spyOn(apiService.http, 'fetch');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('omits the _inspect prop on the response as decoding', async () => {
    fetchMock.mockReturnValue(new Promise((r) => r(defaultResponse)));

    const resp = await getDynamicSettings();

    expect(resp).toEqual(omit(defaultResponse, ['_inspect']));
  });
});
