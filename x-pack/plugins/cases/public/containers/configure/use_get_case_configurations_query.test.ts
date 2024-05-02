/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useGetCaseConfigurationsQuery } from './use_get_case_configurations_query';
import * as api from './api';
import { waitFor } from '@testing-library/react';
import { useToasts } from '../../common/lib/kibana';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { initialConfiguration } from './utils';

jest.mock('./api');
jest.mock('../../common/lib/kibana');

describe('Use get case configurations query hook', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');

    renderHook(
      () => useGetCaseConfigurationsQuery({ select: (data) => data || initialConfiguration }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('shows a toast error when the api return an error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spy = jest.spyOn(api, 'getCaseConfigure').mockRejectedValue(new Error('error'));

    renderHook(
      () => useGetCaseConfigurationsQuery({ select: (data) => data || initialConfiguration }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        signal: expect.any(AbortSignal),
      });

      expect(addError).toHaveBeenCalled();
    });
  });

  it('calls select correctly', async () => {
    const select = jest.fn();
    const spy = jest.spyOn(api, 'getCaseConfigure');
    const data = [{ ...initialConfiguration, id: 'my-new-configuration' }];

    spy.mockResolvedValue(data);

    renderHook(() => useGetCaseConfigurationsQuery({ select }), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(select).toHaveBeenCalledWith(data);
    });
  });
});
