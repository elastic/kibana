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

import {
  DEFAULT_VALUES,
  mockElasticsearchIndices,
  mockSearchIndexOptions,
} from '../../__mocks__/engine_creation_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';

describe('EngineCreationLogic', () => {
  const { mount } = new LogicMounter(EngineCreationLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;

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
          isAliasRequired: false,
        });
      });

      it('sets aliasRawName and isAliasRequired if it does not start with "search-"', () => {
        mount();
        EngineCreationLogic.actions.setSelectedIndex('test-index');
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          selectedIndex: 'test-index',
          aliasName: 'search-test-index-alias',
          aliasRawName: 'search-test-index-alias',
          isAliasRequired: true,
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

    describe('setAliasRawName', () => {
      it('sets aliasRawName', () => {
        mount();
        EngineCreationLogic.actions.setAliasRawName('search index name');
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          aliasRawName: 'search index name',
          aliasName: 'search-index-name',
        });
      });
    });

    describe('setCreationStep', () => {
      it('sets currentEngineCreationStep', () => {
        mount();
        EngineCreationLogic.actions.setCreationStep(EngineCreationSteps.ConfigureStep);
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          currentEngineCreationStep: EngineCreationSteps.ConfigureStep,
        });
      });
    });

    describe('setIsAliasAllowed', () => {
      it('sets isAliasAllowed', () => {
        mount();
        EngineCreationLogic.actions.setIsAliasAllowed(false);
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isAliasAllowed: false,
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

        it('should disable button if non "search-" index selected without alias', () => {
          mount({
            rawName: 'my-engine-name',
            selectedIndex: 'my-index',
            aliasRawName: '',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(true);
        });

        it('should disable button if non "search-" index selected and non "search-" alias', () => {
          mount({
            rawName: 'my-engine-name',
            selectedIndex: 'my-index',
            aliasRawName: 'an-alias',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(true);
        });

        it('should disable button if "search-" index selected and non "search-" alias', () => {
          mount({
            rawName: 'my-engine-name',
            selectedIndex: 'search-my-index',
            aliasRawName: 'an-alias',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(true);
        });

        it('should enable button if all selected and "search-" index', () => {
          mount({
            rawName: 'my-engine-name',
            selectedIndex: 'search-my-index-1',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(false);
        });

        it('should enable button if all selected and "search-" alias', () => {
          mount({
            rawName: 'my-engine-name',
            selectedIndex: 'my-index-1',
            aliasRawName: 'search-my-index-1',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(false);
        });

        it('should enable button if all selected and "search-" index and alias', () => {
          mount({
            rawName: 'my-engine-name',
            selectedIndex: 'my-index-1',
            aliasRawName: 'search-my-index-1',
            engineType: 'elasticsearch',
          });

          expect(EngineCreationLogic.values.isSubmitDisabled).toBe(false);
        });
      });
    });

    describe('isAliasRequired', () => {
      it('should return false when index is prefixed with "search-"', () => {
        mount({
          selectedIndex: 'search-my-index',
        });

        expect(EngineCreationLogic.values.isAliasRequired).toEqual(false);
      });

      it('should return false when index is not selected', () => {
        mount({
          selectedIndex: '',
        });

        expect(EngineCreationLogic.values.isAliasRequired).toEqual(false);
      });

      it('should return true when index is not prefixed with "search-"', () => {
        mount({
          selectedIndex: 'my-index',
        });

        expect(EngineCreationLogic.values.isAliasRequired).toEqual(true);
      });
    });

    describe('selectedIndexFormatted', () => {
      it('should be null if indices is empty', () => {
        mount({
          indices: [],
        });

        expect(EngineCreationLogic.values.selectedIndexFormatted).toBeUndefined();
      });

      it('should be null if there is no selectedIndex', () => {
        mount({
          indices: mockElasticsearchIndices,
          selectedIndex: '',
        });

        expect(EngineCreationLogic.values.selectedIndexFormatted).toBeUndefined();
      });

      it('should select the correctly formatted search index', () => {
        mount({
          indices: mockElasticsearchIndices,
          selectedIndex: 'search-my-index-2',
        });
        const mockCheckedSearchIndexOptions = [...mockSearchIndexOptions];
        mockCheckedSearchIndexOptions[2].checked = 'on';

        expect(EngineCreationLogic.values.selectedIndexFormatted).toEqual(
          mockCheckedSearchIndexOptions[2]
        );
      });
    });

    describe('aliasName', () => {
      it('should format the aliasName by replacing whitespace with hyphens from the aliasRawName', () => {
        mount({
          aliasRawName: '  search my    index-------now',
        });

        expect(EngineCreationLogic.values.aliasName).toEqual('search-my-index-now');
      });
    });

    describe('aliasNameErrorMessage', () => {
      it('should be an empty string if indices is empty', () => {
        mount({
          indices: [],
        });

        expect(EngineCreationLogic.values.aliasNameErrorMessage).toEqual('');
      });

      it('should be an empty string if there is no aliasName', () => {
        mount({
          aliasName: '',
          indices: mockElasticsearchIndices,
        });

        expect(EngineCreationLogic.values.aliasNameErrorMessage).toEqual('');
      });

      it('should set an error message if there is an existing alias/index', () => {
        mount({
          aliasRawName: 'alias-without-manage-privilege',
          indices: mockElasticsearchIndices,
        });

        // ugly, but cannot use dedent here and pass Kibana's Checks
        expect(EngineCreationLogic.values.aliasNameErrorMessage).toEqual(`
There is an existing index or alias with the name alias-without-manage-privilege.
Please choose another alias name.
`);
      });
    });

    describe('showAliasNameErrorMessages', () => {
      it('should be false if there is no error message', () => {
        mount({
          aliasNameErrorMessage: '',
        });

        expect(EngineCreationLogic.values.showAliasNameErrorMessages).toBe(false);
      });

      it('should be true if there is an error message', () => {
        mount({
          aliasRawName: 'alias-without-manage-privilege',
          indices: mockElasticsearchIndices,
        });

        expect(EngineCreationLogic.values.showAliasNameErrorMessages).toBe(true);
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
      describe('Indexed engine', () => {
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

      describe('Elasticsearch index based engine', () => {
        beforeEach(() => {
          mount({
            engineType: 'elasticsearch',
            name: 'engine-name',
            selectedIndex: 'search-selected-index',
          });
        });

        afterEach(() => {
          jest.clearAllMocks();
        });

        it('POSTS to /internal/app_search/elasticsearch/engines', () => {
          const body = JSON.stringify({
            name: EngineCreationLogic.values.name,
            search_index: {
              type: 'elasticsearch',
              index_name: EngineCreationLogic.values.selectedIndex,
            },
          });
          EngineCreationLogic.actions.submitEngine();

          expect(http.post).toHaveBeenCalledWith('/internal/app_search/elasticsearch/engines', {
            body,
          });
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

        it('adds alias_name to the payload if aliasName is present', () => {
          mount({
            engineType: 'elasticsearch',
            name: 'engine-name',
            selectedIndex: 'selected-index',
            aliasRawName: 'search-selected-index',
          });

          const body = JSON.stringify({
            name: EngineCreationLogic.values.name,
            search_index: {
              type: 'elasticsearch',
              index_name: EngineCreationLogic.values.selectedIndex,
              alias_name: EngineCreationLogic.values.aliasName,
            },
          });
          EngineCreationLogic.actions.submitEngine();

          expect(http.post).toHaveBeenCalledWith('/internal/app_search/elasticsearch/engines', {
            body,
          });
        });
      });
    });

    describe('loadIndices', () => {
      beforeEach(() => {
        mount();
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('GETs to /internal/enterprise_search/search_indices', () => {
        EngineCreationLogic.actions.loadIndices();
        expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/search_indices');
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
