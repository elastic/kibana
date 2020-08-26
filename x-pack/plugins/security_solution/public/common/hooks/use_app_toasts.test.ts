/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useToasts } from '../lib/kibana';
import { useAppToasts } from './use_app_toasts';

jest.mock('../lib/kibana');

describe('useDeleteList', () => {
  let addErrorMock: jest.Mock;
  let addSuccessMock: jest.Mock;

  beforeEach(() => {
    addErrorMock = jest.fn();
    addSuccessMock = jest.fn();
    (useToasts as jest.Mock).mockImplementation(() => ({
      addError: addErrorMock,
      addSuccess: addSuccessMock,
    }));
  });

  it('works normally with a regular error', async () => {
    const error = new Error('regular error');
    const { result } = renderHook(() => useAppToasts());

    result.current.addError(error, { title: 'title' });

    expect(addErrorMock).toHaveBeenCalledWith(error, { title: 'title' });
  });

  it("uses a AppError's body.message as the toastMessage", async () => {
    const kibanaApiError = {
      message: 'Not Found',
      body: { status_code: 404, message: 'Detailed Message' },
    };

    const { result } = renderHook(() => useAppToasts());

    result.current.addError(kibanaApiError, { title: 'title' });

    expect(addErrorMock).toHaveBeenCalledWith(kibanaApiError, {
      title: 'title',
      toastMessage: 'Detailed Message',
    });
  });

  it('converts an unknown error to an Error', () => {
    const unknownError = undefined;

    const { result } = renderHook(() => useAppToasts());

    result.current.addError(unknownError, { title: 'title' });

    expect(addErrorMock).toHaveBeenCalledWith(Error(`${undefined}`), {
      title: 'title',
    });
  });
});
