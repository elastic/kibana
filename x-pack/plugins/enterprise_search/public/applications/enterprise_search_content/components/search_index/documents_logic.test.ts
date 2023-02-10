/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';
import { MappingsApiLogic } from '../../api/mappings/mappings_logic';
import { SearchDocumentsApiLogic } from '../../api/search_documents/search_documents_api_logic';

import {
  DocumentsLogic,
  INDEX_DOCUMENTS_META_DEFAULT,
  convertMetaToPagination,
} from './documents_logic';
import { IndexNameLogic } from './index_name_logic';

export const DEFAULT_VALUES = {
  data: undefined,
  docsPerPage: 25,
  indexName: 'indexName',
  isLoading: true,
  mappingData: undefined,
  mappingStatus: 0,
  meta: INDEX_DOCUMENTS_META_DEFAULT,
  query: '',
  results: [],
  status: Status.IDLE,
};

describe('DocumentsLogic', () => {
  const { mount: mountIndexNameLogic } = new LogicMounter(IndexNameLogic);
  const { mount: mountSearchDocumentsApiLogic } = new LogicMounter(SearchDocumentsApiLogic);
  const { mount: mountMappingsApiLogic } = new LogicMounter(MappingsApiLogic);
  const { mount } = new LogicMounter(DocumentsLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    // due to connect, need to pass props down to each logic
    const indexNameProps = { indexName: 'indexName' };
    mountIndexNameLogic(undefined, indexNameProps);
    mountMappingsApiLogic(undefined, indexNameProps);
    mountSearchDocumentsApiLogic(undefined, indexNameProps);
    mount(undefined, indexNameProps);
  });

  it('has expected default values', () => {
    expect(DocumentsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setSearchQuery', () => {
      it('sets query string', () => {
        const newQueryString = 'foo';
        expect(DocumentsLogic.values).toEqual({ ...DEFAULT_VALUES });
        DocumentsLogic.actions.setSearchQuery(newQueryString);
        expect(DocumentsLogic.values).toEqual({ ...DEFAULT_VALUES, query: newQueryString });
      });
    });
    describe('setDocsPerPage', () => {
      it('sets documents to show per page', () => {
        const docsToShow = 50;
        expect(DocumentsLogic.values).toEqual({ ...DEFAULT_VALUES });
        DocumentsLogic.actions.setDocsPerPage(docsToShow);
        expect(DocumentsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          docsPerPage: docsToShow,
          meta: {
            page: {
              ...INDEX_DOCUMENTS_META_DEFAULT.page,
              size: docsToShow,
            },
          },
          simplifiedMapping: undefined,
          status: Status.LOADING,
        });
      });
    });
  });
  describe('listeners', () => {
    describe('setSearchQuery', () => {
      it('make documents apiRequest request after 250ms debounce', async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });
        DocumentsLogic.actions.makeRequest = jest.fn();
        DocumentsLogic.actions.setSearchQuery('test');
        await nextTick();
        expect(DocumentsLogic.actions.makeRequest).not.toHaveBeenCalled();
        jest.advanceTimersByTime(250);
        await nextTick();
        expect(DocumentsLogic.actions.makeRequest).toHaveBeenCalledWith({
          docsPerPage: 25,
          indexName: 'indexName',
          pagination: convertMetaToPagination(INDEX_DOCUMENTS_META_DEFAULT),
          query: 'test',
        });
        jest.useRealTimers();
      });
    });
  });
  describe('selectors', () => {
    describe('isLoading', () => {
      it('sets isLoading false when mapping and documents requests are success', () => {
        const mockSuccessData = {
          _shards: { failed: 0, successful: 3, total: 3 },
          hits: { hits: [] },
          timed_out: false,
          took: 3,
        };
        expect(DocumentsLogic.values).toEqual({ ...DEFAULT_VALUES });
        MappingsApiLogic.actions.apiSuccess({ mappings: {} });
        SearchDocumentsApiLogic.actions.apiSuccess({
          meta: INDEX_DOCUMENTS_META_DEFAULT,
          results: mockSuccessData,
        });

        expect(DocumentsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            meta: INDEX_DOCUMENTS_META_DEFAULT,
            results: mockSuccessData,
          },
          isLoading: false,
          mappingData: {
            mappings: {},
          },
          mappingStatus: Status.SUCCESS,
          status: Status.SUCCESS,
        });
      });

      it('sets isLoading false when one of mappings or documents requests are not done', () => {
        expect(DocumentsLogic.values).toEqual({ ...DEFAULT_VALUES });
        MappingsApiLogic.actions.apiError({} as HttpError);
        expect(DocumentsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
          mappingStatus: Status.ERROR,
          status: Status.IDLE,
        });
      });
    });

    describe('results', () => {
      it('selects searchHits from the response body', () => {
        const mockSuccessData = {
          _shards: { failed: 0, successful: 3, total: 3 },
          hits: { hits: [{ _id: '123', _index: 'indexName', searchHit: true }] },
          timed_out: false,
          took: 3,
        };

        MappingsApiLogic.actions.apiSuccess({ mappings: {} });
        SearchDocumentsApiLogic.actions.apiSuccess({
          meta: {
            page: {
              ...INDEX_DOCUMENTS_META_DEFAULT.page,
              total_pages: 1,
              total_results: 1,
            },
          },
          results: mockSuccessData,
        });

        expect(DocumentsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            meta: {
              page: {
                ...INDEX_DOCUMENTS_META_DEFAULT.page,
                total_pages: 1,
                total_results: 1,
              },
            },
            results: mockSuccessData,
          },
          isLoading: false,
          mappingData: {
            mappings: {},
          },
          mappingStatus: Status.SUCCESS,
          meta: {
            page: {
              ...INDEX_DOCUMENTS_META_DEFAULT.page,
              total_pages: 1,
              total_results: 1,
            },
          },
          results: [{ _id: '123', _index: 'indexName', searchHit: true }],
          simplifiedMapping: undefined,
          status: Status.SUCCESS,
        });
      });
      it("returns empty when response doesn't have hits", () => {
        const mockSuccessData = {
          _shards: { failed: 0, successful: 3, total: 3 },
          hits: { hits: [] },
          timed_out: false,
          took: 3,
        };

        MappingsApiLogic.actions.apiSuccess({ mappings: {} });
        SearchDocumentsApiLogic.actions.apiSuccess({
          meta: INDEX_DOCUMENTS_META_DEFAULT,
          results: mockSuccessData,
        });

        expect(DocumentsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: { meta: INDEX_DOCUMENTS_META_DEFAULT, results: mockSuccessData },
          isLoading: false,
          mappingData: {
            mappings: {},
          },
          mappingStatus: Status.SUCCESS,
          results: [],
          status: Status.SUCCESS,
        });
      });
    });

    describe('simplifiedMapping', () => {
      it('selects properties from the response body', () => {
        MappingsApiLogic.actions.apiSuccess({
          mappings: { properties: { some: { type: 'text' } } },
        });

        expect(DocumentsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
          mappingData: {
            mappings: { properties: { some: { type: 'text' } } },
          },
          mappingStatus: Status.SUCCESS,
          simplifiedMapping: { some: { type: 'text' } },
        });
      });
    });
  });
});
