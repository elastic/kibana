/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { IEsError } from 'src/plugins/data/public';

import { useToasts } from '../lib/kibana';
import { useAppToasts } from './use_app_toasts';

jest.mock('../lib/kibana');

describe('useAppToasts', () => {
  let addErrorMock: jest.Mock;
  let addSuccessMock: jest.Mock;
  let addWarningMock: jest.Mock;

  beforeEach(() => {
    addErrorMock = jest.fn();
    addSuccessMock = jest.fn();
    addWarningMock = jest.fn();
    (useToasts as jest.Mock).mockImplementation(() => ({
      addError: addErrorMock,
      addSuccess: addSuccessMock,
      addWarning: addWarningMock,
    }));
  });

  it('works normally with a regular error', async () => {
    const error = new Error('regular error');
    const { result } = renderHook(() => useAppToasts());

    result.current.addError(error, { title: 'title' });

    expect(addErrorMock).toHaveBeenCalledWith(error, { title: 'title' });
  });

  it('converts an unknown error to an Error', () => {
    const unknownError = undefined;

    const { result } = renderHook(() => useAppToasts());

    result.current.addError(unknownError, { title: 'title' });

    expect(addErrorMock).toHaveBeenCalledWith(Error(`${undefined}`), {
      title: 'title',
    });
  });

  it('works normally with a bsearch type error', async () => {
    const error = ({
      message: 'some message',
      attributes: {},
      err: {
        statusCode: 400,
        innerMessages: { somethingElse: 'message' },
      },
    } as unknown) as IEsError;
    const { result } = renderHook(() => useAppToasts());

    result.current.addError(error, { title: 'title' });
    const errorObj = addErrorMock.mock.calls[0][0];
    expect(errorObj).toEqual({
      message: 'some message (400)',
      name: 'some message',
      stack:
        '{\n  "statusCode": 400,\n  "innerMessages": {\n    "somethingElse": "message"\n  }\n}',
    });
  });
});
