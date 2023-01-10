/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  IndicesGetMappingIndexMappingRecord,
  MappingProperty,
  SearchResponseBody,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';

import { ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } from '../../../../../common/constants';
import { Meta } from '../../../../../common/types';
import { Status } from '../../../../../common/types/api';

import { updateMetaPageIndex } from '../../../shared/table_pagination';

import { MappingsApiLogic } from '../../api/mappings/mappings_logic';
import { SearchDocumentsApiLogic } from '../../api/search_documents/search_documents_api_logic';

import { IndexNameLogic } from './index_name_logic';

export const INDEX_DOCUMENTS_META_DEFAULT = {
  page: {
    current: 0,
    size: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
    total_pages: 0,
    total_results: 0,
  },
};

export const DEFAULT_PAGINATION = {
  pageIndex: INDEX_DOCUMENTS_META_DEFAULT.page.current,
  pageSize: INDEX_DOCUMENTS_META_DEFAULT.page.size,
  totalItemCount: INDEX_DOCUMENTS_META_DEFAULT.page.total_results,
};

interface DocumentsLogicActions {
  apiReset: typeof SearchDocumentsApiLogic.actions.apiReset;
  makeMappingRequest: typeof MappingsApiLogic.actions.makeRequest;
  makeRequest: typeof SearchDocumentsApiLogic.actions.makeRequest;
  onPaginate(newPageIndex: number): { newPageIndex: number };
  setDocsPerPage(docsPerPage: number): { docsPerPage: number };
  setSearchQuery(query: string): { query: string };
}

export interface DocumentsLogicValues {
  data: typeof SearchDocumentsApiLogic.values.data;
  docsPerPage: number;
  indexName: typeof IndexNameLogic.values.indexName;
  isLoading: boolean;
  mappingData: IndicesGetMappingIndexMappingRecord;
  mappingStatus: Status;
  meta: Meta;
  query: string;
  results: SearchHit[];
  simplifiedMapping: Record<string, MappingProperty> | undefined;
  status: Status;
}

export const convertMetaToPagination = (meta: Meta) => ({
  pageIndex: meta.page.current,
  pageSize: meta.page.size,
  totalItemCount: meta.page.total_results,
});

export const DocumentsLogic = kea<MakeLogicType<DocumentsLogicValues, DocumentsLogicActions>>({
  actions: {
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    setDocsPerPage: (docsPerPage) => ({ docsPerPage }),
    setSearchQuery: (query) => ({ query }),
  },
  connect: {
    actions: [
      SearchDocumentsApiLogic,
      ['apiReset', 'apiSuccess', 'makeRequest'],
      MappingsApiLogic,
      ['makeRequest as makeMappingRequest'],
    ],
    values: [
      SearchDocumentsApiLogic,
      ['data', 'status'],
      MappingsApiLogic,
      ['data as mappingData', 'status as mappingStatus'],
      IndexNameLogic,
      ['indexName'],
    ],
  },
  listeners: ({ actions, values }) => ({
    onPaginate: () => {
      actions.makeRequest({
        docsPerPage: values.docsPerPage,
        indexName: values.indexName,
        pagination: convertMetaToPagination(values.meta),
        query: values.query,
      });
    },
    setDocsPerPage: () => {
      actions.makeRequest({
        docsPerPage: values.docsPerPage,
        indexName: values.indexName,
        pagination: convertMetaToPagination(values.meta),
        query: values.query,
      });
    },
    setSearchQuery: async (_, breakpoint) => {
      await breakpoint(250);
      actions.makeRequest({
        docsPerPage: values.docsPerPage,
        indexName: values.indexName,
        pagination: convertMetaToPagination(values.meta),
        query: values.query,
      });
    },
  }),
  path: ['enterprise_search', 'search_index', 'documents'],
  reducers: () => ({
    docsPerPage: [
      ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
      {
        setDocsPerPage: (_, { docsPerPage }) => docsPerPage,
      },
    ],
    meta: [
      INDEX_DOCUMENTS_META_DEFAULT,
      {
        apiSuccess: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
        setDocsPerPage: (_, { docsPerPage }) => ({
          page: { ...INDEX_DOCUMENTS_META_DEFAULT.page, size: docsPerPage },
        }),
      },
    ],
    query: [
      '',
      {
        setSearchQuery: (_, { query }) => query,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isLoading: [
      () => [selectors.status, selectors.mappingStatus],
      (status, mappingStatus) => status !== Status.SUCCESS || mappingStatus !== Status.SUCCESS,
    ],
    results: [
      () => [selectors.data],
      (data: { results: SearchResponseBody }) => {
        return data?.results?.hits?.hits || [];
      },
    ],
    simplifiedMapping: [
      () => [selectors.mappingStatus, selectors.mappingData],
      (status: Status, mapping: IndicesGetMappingIndexMappingRecord) => {
        if (status !== Status.SUCCESS) return;
        return mapping?.mappings?.properties;
      },
    ],
  }),
});
