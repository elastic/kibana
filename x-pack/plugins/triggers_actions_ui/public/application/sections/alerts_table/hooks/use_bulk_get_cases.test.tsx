/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import * as api from './api';
import { waitFor } from '@testing-library/dom';
import { useKibana } from '../../../../common/lib/kibana';
import { useBulkGetCases } from './use_bulk_get_cases';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';

jest.mock('./api');
jest.mock('../../../../common/lib/kibana');

const response = {
  cases: [],
  errors: [],
};

describe('useBulkGetCases', () => {
  const addErrorMock = useKibana().services.notifications.toasts.addError as jest.Mock;

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'bulkGetCases');
    spy.mockResolvedValue(response);

    const { waitForNextUpdate } = renderHook(() => useBulkGetCases(['case-1']), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      {
        ids: ['case-1'],
        fields: ['title', 'description', 'status', 'totalComment', 'created_at', 'created_by'],
      },
      expect.any(AbortSignal)
    );
  });

  it('shows a toast error when the api return an error', async () => {
    const spy = jest.spyOn(api, 'bulkGetCases').mockRejectedValue(new Error('An error'));

    const { waitForNextUpdate } = renderHook(() => useBulkGetCases(['case-1']), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        {
          ids: ['case-1'],
          fields: ['title', 'description', 'status', 'totalComment', 'created_at', 'created_by'],
        },
        expect.any(AbortSignal)
      );
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
