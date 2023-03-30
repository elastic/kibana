/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useInfiniteFindCaseUserActions } from './use_infinite_find_case_user_actions';
import type { CaseUserActionTypeWithAll } from '../../common/ui/types';
import { basicCase, findCaseUserActionsResponse } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const initialData = {
  data: undefined,
  isError: false,
  isLoading: true,
};

// const generateMockedResponse = (page: any) => {
//   const currentPage = Number(page);
//   // const nextPage = currentPage + 1;

//   return {
//         ...findCaseUserActionsResponse,
//         page: currentPage,
//   };
// };

describe('UseInfiniteFindCaseUserActions', () => {
  const filterActionType: CaseUserActionTypeWithAll = 'all';
  const sortOrder: 'asc' | 'desc' = 'asc';
  const params = {
    type: filterActionType,
    sortOrder,
    perPage: 10,
  };
  const isEnabled = true;

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns proper state on findCaseUserActions', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useInfiniteFindCaseUserActions(basicCase.id, params, isEnabled),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();

    expect(result.current).toEqual(
      expect.objectContaining({
        ...initialData,
        data: {
          pages: [
            {
              userActions: [...findCaseUserActionsResponse.userActions],
              total: 20,
              perPage: 10,
              page: 1,
            },
          ],
          pageParams: [undefined],
        },
        isError: false,
        isLoading: false,
        isFetching: false,
      })
    );
  });

  it('calls the API with correct parameters', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(initialData);

    const { waitForNextUpdate } = renderHook(
      () =>
        useInfiniteFindCaseUserActions(
          basicCase.id,
          {
            type: 'user',
            sortOrder: 'desc',
            perPage: 5,
          },
          isEnabled
        ),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(
      basicCase.id,
      { type: 'user', sortOrder: 'desc', page: 1, perPage: 5 },
      expect.any(AbortSignal)
    );
  });

  it('does not call API when not enabled', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(initialData);

    renderHook(
      () =>
        useInfiniteFindCaseUserActions(
          basicCase.id,
          {
            type: 'user',
            sortOrder: 'desc',
            perPage: 5,
          },
          false
        ),
      { wrapper: appMockRender.AppWrapper }
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows a toast error when the API returns an error', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(new Error("C'est la vie"));

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { waitForNextUpdate } = renderHook(
      () => useInfiniteFindCaseUserActions(basicCase.id, params, isEnabled),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(
      basicCase.id,
      { type: filterActionType, sortOrder, page: 1, perPage: 10 },
      expect.any(AbortSignal)
    );
    expect(addError).toHaveBeenCalled();
  });

  // describe('getNextPageParams', () => {
  //   beforeAll(() => {
  //     nock("https://localhost:5601/api/")
  //       .defaultReplyHeaders({
  //         "access-control-allow-origin": "*",
  //         "access-control-allow-credentials": "true",
  //       })
  //       .persist()
  //       .get("/user_actions/_find")
  //       .query(true)
  //       .reply(200, (uri) => {
  //         const url = new URL(`https://localhost:5601/api/${uri}`);
  //         const { page } = Object.fromEntries(url.searchParams);
  //         return generateMockedResponse(page);
  //       });
  //   });

  //   afterEach(cleanup);

  //   test("fetches next page", async () => {
  //     const { result, waitFor } = renderHook(
  //       () => useInfiniteFindCaseUserActions(basicCase.id, params, isEnabled),
  //       { wrapper: appMockRender.AppWrapper }
  //     );

  //     await waitFor(() => result.current.isSuccess);

  //     expect(result.current.data?.pages).toStrictEqual([
  //       generateMockedResponse(1),
  //     ]);

  //     expect(result.current.hasNextPage).toBe(true);

  //     act(() => {
  //       result.current.fetchNextPage();
  //     });

  //     await waitFor(() => result.current.data?.pages.length === 2);

  //     expect(result.current.data?.pages).toStrictEqual([
  //       generateMockedResponse(1),
  //       generateMockedResponse(2),
  //     ]);
  //   });

  //   it("fetches the next page", async () => {
  //     // Fetches Page 1
  //     const { result } = renderHook(
  //       () => useInfiniteFindCaseUserActions(basicCase.id, params, isEnabled),
  //       {
  //         wrapper: appMockRender.AppWrapper,
  //       }
  //     );

  //     await waitFor(() => expect(result.current.status === "success").toBe(true));

  //     expect(result.current.data?.pages[0]).toStrictEqual(findCaseUserActionsResponse);

  //     // Fetches Page 2

  //     result.current.fetchNextPage();
  //     // await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));
  //     // await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));

  //     expect(result.current.data?.pages).toEqual([
  //       findCaseUserActionsResponse,
  //       {...findCaseUserActionsResponse, page: 2},
  //     ]);
  //   });
  // });
});
