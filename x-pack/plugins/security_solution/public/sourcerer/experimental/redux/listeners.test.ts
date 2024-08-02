/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  init,
  selectDataView,
  setDataViewData as setDataViewSpec,
  setPatternList,
} from './actions';
import { createInitDataviewListener, createChangeDataviewListener } from './listeners';
import { isExperimentalSourcererEnabled } from '../is_enabled';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import { type ListenerEffectAPI } from '@reduxjs/toolkit';
import type { AppDispatch } from './listeners';
import { type State } from '../../../common/store/types';

jest.mock('../is_enabled', () => ({
  isExperimentalSourcererEnabled: jest.fn().mockReturnValue(true),
}));

type ListenerApi = ListenerEffectAPI<State, AppDispatch>;

describe('Listeners', () => {
  describe('createInitDataviewListener', () => {
    let listenerOptions: ReturnType<typeof createInitDataviewListener>;
    let listenerApi: ListenerApi;

    beforeEach(() => {
      listenerOptions = createInitDataviewListener({});
      listenerApi = {
        dispatch: jest.fn(),
        getState: jest.fn(() => ({ dataViewPicker: { state: 'pristine' } })),
      } as unknown as ListenerApi;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('does not dispatch if experimental feature is disabled', async () => {
      jest.mocked(isExperimentalSourcererEnabled).mockReturnValue(false);

      await listenerOptions.effect(init('test-view'), listenerApi);
      expect(listenerApi.dispatch).not.toHaveBeenCalled();
    });

    test('does not dispatch if state is not pristine', async () => {
      jest.mocked(isExperimentalSourcererEnabled).mockReturnValue(true);
      listenerApi.getState = jest.fn(() => ({
        dataViewPicker: { state: 'not_pristine' },
      })) as unknown as ListenerApi['getState'];

      await listenerOptions.effect(init('test-view'), listenerApi);
      expect(listenerApi.dispatch).not.toHaveBeenCalled();
    });

    test('dispatches selectDataView action if state is pristine and experimental feature is enabled', async () => {
      jest.mocked(isExperimentalSourcererEnabled).mockReturnValue(true);
      await listenerOptions.effect(init('test-id'), listenerApi);
      expect(listenerApi.dispatch).toHaveBeenCalledWith(selectDataView('test-id'));
    });
  });

  describe('createChangeDataviewListener', () => {
    let listenerOptions: ReturnType<typeof createChangeDataviewListener>;
    let listenerApi: ListenerApi;
    let dataViewsServiceMock: DataViewsServicePublic;

    beforeEach(() => {
      dataViewsServiceMock = {
        get: jest.fn(async () => ({
          toSpec: jest.fn(() => ({ id: 'test_spec' })),
          getIndexPattern: jest.fn(() => 'index_pattern'),
        })),
        getExistingIndices: jest.fn(async () => ['pattern1', 'pattern2']),
      } as unknown as DataViewsServicePublic;

      listenerOptions = createChangeDataviewListener({ dataViewsService: dataViewsServiceMock });
      listenerApi = {
        dispatch: jest.fn(),
      } as unknown as ListenerApi;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('fetches data view and dispatches setDataViewSpec and setPatternList actions', async () => {
      await listenerOptions.effect(selectDataView('test_id'), listenerApi);

      expect(dataViewsServiceMock.get).toHaveBeenCalledWith('test_id', true, false);
      expect(listenerApi.dispatch).toHaveBeenCalledWith(setDataViewSpec({ id: 'test_spec' }));
      expect(dataViewsServiceMock.getExistingIndices).toHaveBeenCalledWith(['index_pattern']);
      expect(listenerApi.dispatch).toHaveBeenCalledWith(setPatternList(['pattern1', 'pattern2']));
    });
  });
});
