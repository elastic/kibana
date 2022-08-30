/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { GENERAL_CASES_OWNER } from '../../common/constants';
import { useToasts } from '../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer } from '../common/mock';
import * as api from './api';
import { useFindAssignees } from './use_find_assignees';

jest.mock('../common/lib/kibana');
jest.mock('./api');

describe('useFindAssignees', () => {
  const props = {
    searchTerm: 'elastic',
    owners: [GENERAL_CASES_OWNER],
  };

  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.restoreAllMocks();

    appMockRender = createAppMockRenderer();
  });

  it('calls findAssignees with correct arguments', async () => {
    const spyOnFindAssignees = jest.spyOn(api, 'findAssignees');

    const { result, waitFor } = renderHook(() => useFindAssignees(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => result.current.isSuccess);

    expect(spyOnFindAssignees).toBeCalledWith({
      ...props,
      size: 10,
      signal: expect.anything(),
    });
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnFindAssignees = jest.spyOn(api, 'findAssignees');

    spyOnFindAssignees.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    const { result, waitFor } = renderHook(() => useFindAssignees(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => result.current.isError);

    expect(addError).toHaveBeenCalled();
  });
});
