/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useGetFeatureIds } from './use_get_feature_ids';
import * as api from './api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetFeaturesIds', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('returns the features ids correctly', async () => {
    const spy = jest.spyOn(api, 'getFeatureIds').mockRejectedValue([]);

    const { waitForNextUpdate } = renderHook(() => useGetFeatureIds(['context1']), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        query: { registrationContext: ['context1'] },
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('shows a toast error when the api return an error', async () => {
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spy = jest
      .spyOn(api, 'getFeatureIds')
      .mockRejectedValue(new Error('Something went wrong'));

    const { waitForNextUpdate } = renderHook(() => useGetFeatureIds(['context1']), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        query: { registrationContext: ['context1'] },
        signal: expect.any(AbortSignal),
      });
      expect(addError).toHaveBeenCalled();
    });
  });
});
