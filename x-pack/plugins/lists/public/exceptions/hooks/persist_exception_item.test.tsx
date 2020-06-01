/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { createKibanaCoreStartMock } from '../../common/mocks/kibana_core';

import { ReturnPersistExceptionItem, usePersistExceptionItem } from './persist_exception_item';

jest.mock('../api');

const mockKibanaHttpService = createKibanaCoreStartMock().http;

describe('usePersistExceptionItem', () => {
  test('init', async () => {
    const onError = jest.fn();
    const { result } = renderHook<unknown, ReturnPersistExceptionItem>(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving exception item with isLoading === true', async () => {
    await act(async () => {
      const onError = jest.fn();
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnPersistExceptionItem>(
        () => usePersistExceptionItem({ http: mockKibanaHttpService, onError })
      );
      await waitForNextUpdate();
      result.current[1](getExceptionListItemSchemaMock());
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved exception item with isSaved === true', async () => {
    const onError = jest.fn();
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPersistExceptionItem>(() =>
        usePersistExceptionItem({ http: mockKibanaHttpService, onError })
      );
      await waitForNextUpdate();
      result.current[1](getExceptionListItemSchemaMock());
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
