/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGetAllCaseConfigurations } from './use_get_all_case_configurations';
import * as api from './api';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

jest.mock('./api');

describe('Use get all case configurations hook', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('returns all available configurations', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');
    spy.mockResolvedValue([
      // @ts-expect-error: no need to define all properties
      { id: 'my-configuration-1', owner: '1' },
      // @ts-expect-error: no need to define all properties
      { id: 'my-configuration-2', owner: '2' },
      // @ts-expect-error: no need to define all properties
      { id: 'my-configuration-3', owner: '3' },
    ]);

    const { result, waitForNextUpdate } = renderHook(() => useGetAllCaseConfigurations(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    /**
     * Ensures that the initial data is returned≠
     * before fetching
     */
    // @ts-expect-error: data is defined
    expect(result.all[0].data).toEqual([
      {
        closureType: 'close-by-user',
        connector: { fields: null, id: 'none', name: 'none', type: '.none' },
        customFields: [],
        templates: [],
        id: '',
        mappings: [],
        version: '',
        owner: '',
      },
    ]);

    /**
     * The response after fetching
     */
    // @ts-expect-error: data is defined
    expect(result.all[1].data).toEqual([
      { id: 'my-configuration-1', owner: '1' },
      { id: 'my-configuration-2', owner: '2' },
      { id: 'my-configuration-3', owner: '3' },
    ]);
  });

  it('returns the initial configuration if none is available', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');
    spy.mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() => useGetAllCaseConfigurations(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    /**
     * Ensures that the initial data is returned≠
     * before fetching
     */
    // @ts-expect-error: data is defined
    expect(result.all[0].data).toEqual([
      {
        closureType: 'close-by-user',
        connector: { fields: null, id: 'none', name: 'none', type: '.none' },
        customFields: [],
        templates: [],
        id: '',
        mappings: [],
        version: '',
        owner: '',
      },
    ]);
  });
});
