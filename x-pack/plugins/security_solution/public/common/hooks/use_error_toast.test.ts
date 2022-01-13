/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useErrorToast } from './use_error_toast';

jest.mock('./use_app_toasts');

import { useAppToasts } from './use_app_toasts';

describe('useErrorToast', () => {
  let addErrorMock: jest.Mock;

  beforeEach(() => {
    addErrorMock = jest.fn();
    (useAppToasts as jest.Mock).mockImplementation(() => ({
      addError: addErrorMock,
    }));
  });

  it('calls useAppToasts error when an error param is provided', () => {
    const title = 'testErrorTitle';
    const error = new Error();
    renderHook(() => useErrorToast(title, error));

    expect(addErrorMock).toHaveBeenCalledWith(error, { title });
  });

  it("doesn't call useAppToasts error when an error param is undefined", () => {
    const title = 'testErrorTitle';
    const error = undefined;
    renderHook(() => useErrorToast(title, error));

    expect(addErrorMock).not.toHaveBeenCalled();
  });
});
