/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { UseFindCaseUserActions } from './use_find_case_user_actions';
import { useFindCaseUserActions } from './use_find_case_user_actions';
import { basicCase, caseUserActions, elasticUser, getUserAction } from './mock';
import { Actions } from '../../common/api';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { testQueryClient } from '../common/mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const initialData = {
  data: undefined,
  isError: false,
  isLoading: true,
};

const wrapper: React.FC<string> = ({ children }) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

describe('UseFindCaseUserActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns proper state on getCaseUserActions', async () => {
    const { result, waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
      () => useFindCaseUserActions(basicCase.id),
      { wrapper }
    );

    await waitForNextUpdate();

    expect(result.current).toEqual(
      expect.objectContaining({
        ...initialData,
        data: {
          caseUserActions,
          participants: [elasticUser],
          profileUids: new Set(),
        },
        isError: false,
        isLoading: false,
        isFetching: false,
      })
    );
  });

  it('shows a toast error when the API returns an error', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(new Error("C'est la vie"));

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
      () => useFindCaseUserActions(basicCase.id),
      { wrapper }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(basicCase.id, expect.any(AbortSignal));
    expect(addError).toHaveBeenCalled();
  });

  describe('getProfileUids', () => {
    it('aggregates the uids from the createdBy field of a user action', async () => {
      jest.spyOn(api, 'findCaseUserActions').mockReturnValue(
        Promise.resolve({
          page: 1,
          perPage: 1000,
          total: 20,
          userActions: [getUserAction('pushed', Actions.add, { createdBy: { profileUid: '456' } })],
        })
      );

      const { result, waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
        () => useFindCaseUserActions(basicCase.id),
        { wrapper }
      );

      await waitForNextUpdate();

      expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "456",
            }
          `);
    });

    it('aggregates the uids from a push', async () => {
      jest.spyOn(api, 'findCaseUserActions').mockReturnValue(
        Promise.resolve({
          page: 1,
          perPage: 1000,
          total: 20,
          userActions: [
            getUserAction('pushed', Actions.add, {
              payload: { externalService: { pushedBy: { profileUid: '123' } } },
            }),
          ],
        })
      );

      const { result, waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
        () => useFindCaseUserActions(basicCase.id),
        { wrapper }
      );

      await waitForNextUpdate();

      expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "123",
            }
          `);
    });

    it('aggregates the uids from an assignment add user action', async () => {
      jest.spyOn(api, 'findCaseUserActions').mockReturnValue(
        Promise.resolve({
          page: 1,
          perPage: 1000,
          total: 20,
          userActions: [...caseUserActions, getUserAction('assignees', Actions.add)],
        })
      );

      const { result, waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
        () => useFindCaseUserActions(basicCase.id),
        { wrapper }
      );

      await waitForNextUpdate();

      expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
              "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            }
          `);
    });

    it('ignores duplicate uids', async () => {
      jest.spyOn(api, 'findCaseUserActions').mockReturnValue(
        Promise.resolve({
          page: 1,
          perPage: 1000,
          total: 20,
          userActions: [
            ...caseUserActions,
            getUserAction('assignees', Actions.add),
            getUserAction('assignees', Actions.add),
          ],
        })
      );

      const { result, waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
        () => useFindCaseUserActions(basicCase.id),
        { wrapper }
      );

      await waitForNextUpdate();

      expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
              "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            }
          `);
    });

    it('aggregates the uids from an assignment delete user action', async () => {
      jest.spyOn(api, 'findCaseUserActions').mockReturnValue(
        Promise.resolve({
          page: 1,
          perPage: 1000,
          total: 20,
          userActions: [...caseUserActions, getUserAction('assignees', Actions.delete)],
        })
      );

      const { result, waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
        () => useFindCaseUserActions(basicCase.id),
        { wrapper }
      );

      await waitForNextUpdate();

      expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
              "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            }
          `);
    });
  });
});
