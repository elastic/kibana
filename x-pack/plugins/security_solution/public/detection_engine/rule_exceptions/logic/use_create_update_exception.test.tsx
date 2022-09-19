/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { act, renderHook } from '@testing-library/react-hooks';
import { KibanaServices } from '../../../common/lib/kibana';

import * as listsApi from '@kbn/securitysolution-list-api';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getCreateExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { TestProviders } from '../../../common/mock';
import type {
  UseCreateOrUpdateExceptionProps,
  ReturnUseCreateOrUpdateException,
} from './use_create_update_exception';
import { useCreateOrUpdateException } from './use_create_update_exception';

const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../common/lib/kibana');
jest.mock('@kbn/securitysolution-list-api');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('useCreateOrUpdateException', () => {
  let addExceptionListItem: jest.SpyInstance<Promise<ExceptionListItemSchema>>;
  let updateExceptionListItem: jest.SpyInstance<Promise<ExceptionListItemSchema>>;
  let render: () => RenderHookResult<
    UseCreateOrUpdateExceptionProps,
    ReturnUseCreateOrUpdateException
  >;
  const itemsToAdd: CreateExceptionListItemSchema[] = [
    {
      ...getCreateExceptionListItemSchemaMock(),
      name: 'item to add 1',
    },
  ];
  const itemsToUpdate: ExceptionListItemSchema[] = [
    {
      ...getExceptionListItemSchemaMock(),
      name: 'item to update 1',
    },
  ];

  const waitForAddOrUpdateFunc: (arg: {
    waitForNextUpdate: RenderHookResult<
      UseCreateOrUpdateExceptionProps,
      ReturnUseCreateOrUpdateException
    >['waitForNextUpdate'];
    rerender: RenderHookResult<
      UseCreateOrUpdateExceptionProps,
      ReturnUseCreateOrUpdateException
    >['rerender'];
    result: RenderHookResult<
      UseCreateOrUpdateExceptionProps,
      ReturnUseCreateOrUpdateException
    >['result'];
  }) => Promise<ReturnUseCreateOrUpdateException[1]> = async ({
    waitForNextUpdate,
    rerender,
    result,
  }) => {
    await waitForNextUpdate();
    rerender();
    expect(result.current[1]).not.toBeNull();
    return Promise.resolve(result.current[1]);
  };

  beforeEach(() => {
    addExceptionListItem = jest
      .spyOn(listsApi, 'addExceptionListItem')
      .mockResolvedValue(getExceptionListItemSchemaMock());

    updateExceptionListItem = jest
      .spyOn(listsApi, 'updateExceptionListItem')
      .mockResolvedValue(getExceptionListItemSchemaMock());

    render = () =>
      renderHook<UseCreateOrUpdateExceptionProps, ReturnUseCreateOrUpdateException>(
        () => useCreateOrUpdateException(),
        {
          wrapper: TestProviders,
        }
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('initializes hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = render();
      await waitForNextUpdate();
      expect(result.current).toEqual([false, result.current[1]]);
    });
  });

  it('invokes "updateExceptionListItem" if there are items to update', async () => {
    updateExceptionListItem = jest.spyOn(listsApi, 'updateExceptionListItem');
    addExceptionListItem = jest.spyOn(listsApi, 'addExceptionListItem');

    await act(async () => {
      const { rerender, result, waitForNextUpdate } = render();
      await waitForAddOrUpdateFunc({
        rerender,
        result,
        waitForNextUpdate,
      });

      if (result.current != null && result.current[1] != null) {
        await result.current[1]({ items: itemsToUpdate });
      }

      expect(updateExceptionListItem).toHaveBeenCalled();
      expect(addExceptionListItem).not.toHaveBeenCalled();
    });
  });

  it('invokes "addExceptionListItem" if there are items to create', async () => {
    addExceptionListItem = jest.spyOn(listsApi, 'addExceptionListItem');
    updateExceptionListItem = jest.spyOn(listsApi, 'updateExceptionListItem');

    await act(async () => {
      const { rerender, result, waitForNextUpdate } = render();
      await waitForAddOrUpdateFunc({
        rerender,
        result,
        waitForNextUpdate,
      });

      if (result.current != null && result.current[1] != null) {
        await result.current[1]({ items: itemsToAdd });
      }

      expect(updateExceptionListItem).not.toHaveBeenCalled();
      expect(addExceptionListItem).toHaveBeenCalled();
    });
  });
});
