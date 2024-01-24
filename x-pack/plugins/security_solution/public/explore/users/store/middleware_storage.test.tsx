/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { createStore } from '../../../common/store';
import { addUserAssetTableField, removeUserAssetTableField } from './actions';
import { UserAssetTableType } from './model';
import { getUserAssetTableFromStorage } from './storage';
import type { Store } from 'redux';

let store: Store;
const storage = createSecuritySolutionStorageMock().storage;

describe('UsersAssetTable EpicStorage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    storage.clear();
    store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('persist asset table when adding and removing fields', async () => {
    const fieldName = 'test-field';

    // Add field to the table
    store.dispatch(addUserAssetTableField({ tableId: UserAssetTableType.assetEntra, fieldName }));
    await waitFor(() => {
      return expect(getUserAssetTableFromStorage(storage)).toEqual({
        [UserAssetTableType.assetEntra]: { fields: [fieldName] },
      });
    });

    jest.runAllTimers(); // pass the time to ensure that the state is persisted to local storage

    // Remove field from the table
    store.dispatch(
      removeUserAssetTableField({ tableId: UserAssetTableType.assetEntra, fieldName })
    );
    await waitFor(() => {
      return expect(getUserAssetTableFromStorage(storage)).toEqual({
        [UserAssetTableType.assetEntra]: { fields: [] },
      });
    });
  });
});
