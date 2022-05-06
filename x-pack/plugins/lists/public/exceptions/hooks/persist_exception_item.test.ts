/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import * as api from '@kbn/securitysolution-list-api';
import { PersistHookProps } from '@kbn/securitysolution-io-ts-list-types';
import {
  ReturnPersistExceptionItem,
  usePersistExceptionItem,
} from '@kbn/securitysolution-list-hooks';
import { coreMock } from '@kbn/core/public/mocks';

import { ENTRIES_WITH_IDS } from '../../../common/constants.mock';
import { getCreateExceptionListItemSchemaMock } from '../../../common/schemas/request/create_exception_list_item_schema.mock';
import { getUpdateExceptionListItemSchemaMock } from '../../../common/schemas/request/update_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';

const mockKibanaHttpService = coreMock.createStart().http;
jest.mock('@kbn/securitysolution-list-api');

// TODO: Port this test over to packages/kbn-securitysolution-list-hooks/src/use_persist_exception_item/index.test.ts once the other mocks are added to the kbn package system

describe('usePersistExceptionItem', () => {
  const onError = jest.fn();

  beforeEach(() => {
    jest.spyOn(api, 'addExceptionListItem').mockResolvedValue(getExceptionListItemSchemaMock());
    jest.spyOn(api, 'updateExceptionListItem').mockResolvedValue(getExceptionListItemSchemaMock());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes hook', async () => {
    const { result } = renderHook<PersistHookProps, ReturnPersistExceptionItem>(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('"isLoading" is "true" when exception item is being saved', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      result.current[1](getCreateExceptionListItemSchemaMock());
      rerender();

      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('"isSaved" is "true" when exception item saved successfully', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      result.current[1](getCreateExceptionListItemSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });

  test('it invokes "updateExceptionListItem" when payload has "id"', async () => {
    const addExceptionListItem = jest.spyOn(api, 'addExceptionListItem');
    const updateExceptionListItem = jest.spyOn(api, 'updateExceptionListItem');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      // NOTE: Take note here passing in an exception item where it's
      // entries have been enriched with ids to ensure that they get stripped
      // before the call goes through
      result.current[1]({ ...getUpdateExceptionListItemSchemaMock(), entries: ENTRIES_WITH_IDS });
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
      expect(addExceptionListItem).not.toHaveBeenCalled();
      expect(updateExceptionListItem).toHaveBeenCalledWith({
        http: mockKibanaHttpService,
        listItem: getUpdateExceptionListItemSchemaMock(),
        signal: new AbortController().signal,
      });
    });
  });

  test('it invokes "addExceptionListItem" when payload does not have "id"', async () => {
    const updateExceptionListItem = jest.spyOn(api, 'updateExceptionListItem');
    const addExceptionListItem = jest.spyOn(api, 'addExceptionListItem');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      // NOTE: Take note here passing in an exception item where it's
      // entries have been enriched with ids to ensure that they get stripped
      // before the call goes through
      result.current[1]({ ...getCreateExceptionListItemSchemaMock(), entries: ENTRIES_WITH_IDS });
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
      expect(updateExceptionListItem).not.toHaveBeenCalled();
      expect(addExceptionListItem).toHaveBeenCalledWith({
        http: mockKibanaHttpService,
        listItem: getCreateExceptionListItemSchemaMock(),
        signal: new AbortController().signal,
      });
    });
  });

  test('"onError" callback is invoked and "isSaved" is "false" when api call fails', async () => {
    const error = new Error('persist rule failed');
    jest.spyOn(api, 'addExceptionListItem').mockRejectedValue(error);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      result.current[1](getCreateExceptionListItemSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
