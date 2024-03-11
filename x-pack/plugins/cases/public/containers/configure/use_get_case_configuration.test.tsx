/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useGetCaseConfiguration } from './use_get_case_configuration';
import * as api from './api';
import type { AppMockRenderer } from '../../common/mock';
import { mockedTestProvidersOwner, createAppMockRenderer } from '../../common/mock';
import { initialConfiguration } from './utils';

jest.mock('./api');

describe('Use get case configuration hook', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('returns a configuration matching the owner', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');
    const targetConfiguration = {
      id: 'my-new-configuration-3',
      owner: mockedTestProvidersOwner[0], // used in the AppMockRenderer
    };
    spy.mockResolvedValue([
      // @ts-expect-error: no need to define all properties
      { id: 'my-new-configuration-1', owner: 'foo' },
      // @ts-expect-error: no need to define all properties
      { id: 'my-new-configuration-2', owner: 'bar' },
      // @ts-expect-error: no need to define all properties
      targetConfiguration,
    ]);

    const { result, waitForNextUpdate } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    /**
     * The response after fetching
     */
    // @ts-expect-error: data is defined
    expect(result.all[1].data).toEqual(targetConfiguration);
  });

  it('returns the configuration at position zero if none matches the owner', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');
    const targetConfiguration = { id: 'my-new-configuration-1', owner: 'foo' };
    spy.mockResolvedValue([
      // @ts-expect-error: no need to define all properties
      targetConfiguration,
      // @ts-expect-error: no need to define all properties
      { id: 'my-new-configuration-2', owner: 'bar' },
    ]);

    const { result, waitForNextUpdate } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    /**
     * The response after fetching
     */
    // @ts-expect-error: data is defined
    expect(result.all[1].data).toEqual(targetConfiguration);
  });

  it('returns the initial configuration if none exists', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');

    spy.mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    /**
     * The response after fetching
     */
    // @ts-expect-error: data is defined
    expect(result.all[0].data).toEqual(initialConfiguration);
  });
});
