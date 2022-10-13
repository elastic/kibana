/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockKibanaValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { DEFAULT_META } from '../../../shared/constants';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { CurationsLogic } from '.';

describe('CurationsLogic', () => {
  const { mount } = new LogicMounter(CurationsLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { clearFlashMessages, flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;

  const MOCK_CURATIONS_RESPONSE = {
    meta: {
      page: {
        current: 1,
        size: 10,
        total_results: 1,
        total_pages: 1,
      },
    },
    results: [
      {
        id: 'some-curation-id',
        last_updated: 'January 1, 1970 at 12:00PM',
        queries: ['some query'],
        promoted: [],
        hidden: [],
        organic: [],
      },
    ],
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    curations: [],
    meta: DEFAULT_META,
    selectedPageTab: 'overview',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(CurationsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onCurationsLoad', () => {
      it('should set curations and meta state, & dataLoading to false', () => {
        mount();

        CurationsLogic.actions.onCurationsLoad(MOCK_CURATIONS_RESPONSE);

        expect(CurationsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          curations: MOCK_CURATIONS_RESPONSE.results,
          meta: MOCK_CURATIONS_RESPONSE.meta,
          dataLoading: false,
        });
      });
    });

    describe('onPaginate', () => {
      it('should set meta.page.current state', () => {
        mount();

        CurationsLogic.actions.onPaginate(3);

        expect(CurationsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          meta: { page: { ...DEFAULT_VALUES.meta.page, current: 3 } },
        });
      });
    });

    describe('onSelectPageTab', () => {
      it('should set the selected page tab and clear flash messages', () => {
        mount();

        CurationsLogic.actions.onSelectPageTab('settings');

        expect(CurationsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          selectedPageTab: 'settings',
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
  });

  describe('listeners', () => {
    describe('loadCurations', () => {
      it('should make an API call and set curations & meta state', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_CURATIONS_RESPONSE));
        mount();
        jest.spyOn(CurationsLogic.actions, 'onCurationsLoad');

        CurationsLogic.actions.loadCurations();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/curations',
          {
            query: {
              'page[current]': 1,
              'page[size]': 10,
            },
          }
        );
        expect(CurationsLogic.actions.onCurationsLoad).toHaveBeenCalledWith(
          MOCK_CURATIONS_RESPONSE
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        CurationsLogic.actions.loadCurations();
      });
    });

    describe('deleteCuration', () => {
      const confirmSpy = jest.spyOn(window, 'confirm');

      beforeEach(() => {
        confirmSpy.mockImplementation(jest.fn(() => true));
      });

      it('should make an API call and show a success message', async () => {
        http.delete.mockReturnValueOnce(Promise.resolve({}));
        mount();
        jest.spyOn(CurationsLogic.actions, 'loadCurations');

        CurationsLogic.actions.deleteCuration('some-curation-id');
        expect(clearFlashMessages).toHaveBeenCalled();
        await nextTick();

        expect(http.delete).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/curations/some-curation-id'
        );
        expect(CurationsLogic.actions.loadCurations).toHaveBeenCalled();
        expect(flashSuccessToast).toHaveBeenCalledWith('Your curation was deleted');
      });

      it('handles errors', async () => {
        http.delete.mockReturnValueOnce(Promise.reject('error'));
        mount();

        CurationsLogic.actions.deleteCuration('some-curation-id');
        expect(clearFlashMessages).toHaveBeenCalled();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });

      it('does nothing if the user cancels the confirmation prompt', async () => {
        confirmSpy.mockImplementationOnce(() => false);
        mount();

        CurationsLogic.actions.deleteCuration('some-curation-id');
        expect(clearFlashMessages).toHaveBeenCalled();
        await nextTick();

        expect(http.delete).not.toHaveBeenCalled();
      });
    });

    describe('createCuration', () => {
      it('should make an API call and navigate to the new curation', async () => {
        http.post.mockReturnValueOnce(Promise.resolve({ id: 'some-cur-id' }));
        mount();

        CurationsLogic.actions.createCuration(['some query']);
        expect(clearFlashMessages).toHaveBeenCalled();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/curations',
          {
            body: '{"queries":["some query"]}',
          }
        );
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations/some-cur-id');
      });

      it('handles errors', async () => {
        http.post.mockReturnValueOnce(Promise.reject('error'));
        mount();

        CurationsLogic.actions.createCuration(['some query']);
        expect(clearFlashMessages).toHaveBeenCalled();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
