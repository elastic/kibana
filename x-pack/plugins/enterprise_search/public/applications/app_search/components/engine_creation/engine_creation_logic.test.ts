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

import { nextTick } from '@kbn/test-jest-helpers';

import { EngineCreationLogic } from './engine_creation_logic';
import { SearchIndexSelectableOption } from './search_index_selectable';

describe('EngineCreationLogic', () => {
  const { mount } = new LogicMounter(EngineCreationLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    ingestionMethod: '',
    isLoading: false,
    name: '',
    rawName: '',
    language: 'Universal',
    isLoadingIndices: false,
    indices: [],
    indicesFormatted: [],
    selectedIndex: '',
    engineType: 'appSearch',
    isSubmitDisabled: true,
  };

  const mockElasticsearchIndices = [
    {
      health: 'yellow',
      status: 'open',
      name: 'search-my-index-1',
      uuid: 'ydlR_QQJTeyZP66tzQSmMQ',
      total: {
        docs: {
          count: 0,
          deleted: 0,
        },
        store: {
          size_in_bytes: '225b',
        },
      },
    },
    {
      health: 'green',
      status: 'open',
      name: 'search-my-index-2',
      uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
      total: {
        docs: {
          count: 100,
          deleted: 0,
        },
        store: {
          size_in_bytes: '225b',
        },
      },
      aliases: ['search-index-123'],
    },
  ];

  const mockSearchIndexOptions: SearchIndexSelectableOption[] = [
    {
      label: 'search-my-index-1',
      health: 'yellow',
      status: 'open',
      total: {
        docs: {
          count: 0,
          deleted: 0,
        },
        store: {
          size_in_bytes: '225b',
        },
      },
    },
    {
      label: 'search-my-index-2',
      health: 'green',
      status: 'open',
      total: {
        docs: {
          count: 100,
          deleted: 0,
        },
        store: {
          size_in_bytes: '225b',
        },
      },
    },
  ];

  it('has expected default values', () => {
    mount();
    expect(EngineCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setIngestionMethod', () => {
      it('sets ingestion method to the provided value', () => {
        mount();
        EngineCreationLogic.actions.setIngestionMethod('crawler');
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          ingestionMethod: 'crawler',
        });
      });
    });

    describe('setLanguage', () => {
      it('sets language to the provided value', () => {
        mount();
        EngineCreationLogic.actions.setLanguage('English');
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          language: 'English',
        });
      });
    });

    describe('setRawName', () => {
      beforeAll(() => {
        mount();
        EngineCreationLogic.actions.setRawName('Name__With#$&*%Special--Characters');
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('should set rawName to provided value', () => {
        expect(EngineCreationLogic.values.rawName).toEqual('Name__With#$&*%Special--Characters');
      });

      it('should set name to a sanitized value', () => {
        expect(EngineCreationLogic.values.name).toEqual('name-with-special-characters');
      });
    });

    describe('submitEngine', () => {
      it('sets isLoading to true', () => {
        mount({ isLoading: false });
        EngineCreationLogic.actions.submitEngine();
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
        });
      });
    });

    describe('onSubmitError', () => {
      it('resets isLoading to false', () => {
        mount({ isLoading: true });
        EngineCreationLogic.actions.onSubmitError();
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: false,
        });
      });

      it('resets selectedIndex', () => {
        mount({ selectedIndex: 'search-selected-index' });
        EngineCreationLogic.actions.onSubmitError();
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
        });
      });
    });

    describe('loadIndices', () => {
      it('sets isLoadingIndices to true', () => {
        mount({ isLoadingIndices: false });
        EngineCreationLogic.actions.loadIndices();
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoadingIndices: true,
        });
      });
    });

    describe('onLoadIndicesSuccess', () => {
      it('sets isLoadingIndices to false', () => {
        mount({ isLoadingIndices: true });
        EngineCreationLogic.actions.onLoadIndicesSuccess([]);
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoadingIndices: false,
        });
      });
    });

    describe('setSelectedIndex', () => {
      it('sets selected index name', () => {
        mount();
        EngineCreationLogic.actions.setSelectedIndex('search-test-index');
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          selectedIndex: 'search-test-index',
        });
      });
    });

    describe('setEngineType', () => {
      it('sets engine type', () => {
        mount();
        EngineCreationLogic.actions.setEngineType('elasticsearch');
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engineType: 'elasticsearch',
        });
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      mount();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('indicesFormatted', () => {
      it('should return empty array when no index available', () => {
        expect(EngineCreationLogic.values.indices).toEqual([]);
        expect(EngineCreationLogic.values.indicesFormatted).toEqual([]);
      });

      it('should return SearchIndexSelectableOption list calculated from indices', () => {
        mount({
          indices: mockElasticsearchIndices,
        });

        expect(EngineCreationLogic.values.indicesFormatted).toEqual(mockSearchIndexOptions);
      });

      it('should handle checked condition correctly', () => {
        mount({
          indices: mockElasticsearchIndices,
          selectedIndex: 'search-my-index-1',
        });
        const mockCheckedSearchIndexOptions = [...mockSearchIndexOptions];
        mockCheckedSearchIndexOptions[0].checked = 'on';

        expect(EngineCreationLogic.values.indicesFormatted).toEqual(mockCheckedSearchIndexOptions);
      });
    });

    describe('isSubmitDisabled', () => {
      describe('App Search based engine', () => {
        it('should disable button if engine name is empty', () => {
          mount({
            rawName: '',
            engineType: 'appSearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(true);
        });
        it('should enable button if engine name is entered', () => {
          mount({
            rawName: 'my-engine-name',
            engineType: 'appSearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(false);
        });
      });
      describe('Elasticsearch Index based engine', () => {
        it('should disable button if engine name is empty', () => {
          mount({
            rawName: '',
            selectedIndex: 'search-my-index-1',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(true);
        });

        it('should disable button if no index selected', () => {
          mount({
            rawName: 'my-engine-name',
            selectedIndex: '',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(true);
        });

        it('should enable button if all selected', () => {
          mount({
            rawName: 'my-engine-name',
            selectedIndex: 'search-my-index-1',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(false);
        });
      });
    });
  });

  describe('listeners', () => {
    describe('onEngineCreationSuccess', () => {
      beforeAll(() => {
        mount({ language: 'English', rawName: 'test' });
        EngineCreationLogic.actions.onEngineCreationSuccess();
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('should show a success message', () => {
        expect(flashSuccessToast).toHaveBeenCalledWith("Engine 'test' was created");
      });

      it('should navigate the user to the engine page', () => {
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/test');
      });
    });

    describe('submitEngine', () => {
      beforeAll(() => {
        mount({ language: 'English', rawName: 'test' });
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('POSTS to /internal/app_search/engines', () => {
        const body = JSON.stringify({
          name: EngineCreationLogic.values.name,
          language: EngineCreationLogic.values.language,
        });
        EngineCreationLogic.actions.submitEngine();
        expect(http.post).toHaveBeenCalledWith('/internal/app_search/engines', { body });
      });

      it('calls onEngineCreationSuccess on valid submission', async () => {
        jest.spyOn(EngineCreationLogic.actions, 'onEngineCreationSuccess');
        http.post.mockReturnValueOnce(Promise.resolve({}));
        EngineCreationLogic.actions.submitEngine();
        await nextTick();
        expect(EngineCreationLogic.actions.onEngineCreationSuccess).toHaveBeenCalledTimes(1);
      });

      it('calls flashAPIErrors on API Error', async () => {
        http.post.mockReturnValueOnce(Promise.reject());
        EngineCreationLogic.actions.submitEngine();
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });
    });

    describe('loadIndices', () => {
      beforeEach(() => {
        mount();
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('GETs to /internal/enterprise_search/indices', () => {
        EngineCreationLogic.actions.loadIndices();
        expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/indices');
      });

      it('calls onLoadIndicesSuccess with payload on load is successful', async () => {
        jest.spyOn(EngineCreationLogic.actions, 'onLoadIndicesSuccess');
        http.get.mockReturnValueOnce(Promise.resolve([mockElasticsearchIndices[0]]));
        EngineCreationLogic.actions.loadIndices();
        await nextTick();
        expect(EngineCreationLogic.actions.onLoadIndicesSuccess).toHaveBeenCalledWith([
          mockElasticsearchIndices[0],
        ]);
      });

      it('calls flashAPIErros on indices load fails', async () => {
        jest.spyOn(EngineCreationLogic.actions, 'onSubmitError');
        http.get.mockRejectedValueOnce({});
        EngineCreationLogic.actions.loadIndices();
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
        expect(EngineCreationLogic.actions.onSubmitError).toHaveBeenCalledTimes(1);
      });
    });
  });
});
