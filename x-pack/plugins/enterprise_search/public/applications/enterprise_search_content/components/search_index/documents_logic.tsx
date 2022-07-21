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

import { Status } from '../../../../../common/types/api';

import { MappingsApiLogic } from '../../api/mapping/mapping_logic';
import { SearchDocumentsApiLogic } from '../../api/search/search_documents_logic';

import { IndexNameLogic } from './index_name_logic';

interface DocumentsLogicActions {
  apiReset: typeof SearchDocumentsApiLogic.actions.apiReset;
  makeMappingRequest: typeof MappingsApiLogic.actions.makeRequest;
  makeRequest: typeof SearchDocumentsApiLogic.actions.makeRequest;
  setSearchQuery(query: string): { query: string };
}

interface DocumentsLogicValues {
  data: typeof SearchDocumentsApiLogic.values.data;
  indexName: typeof IndexNameLogic.values.indexName;
  isLoading: boolean;
  mappingData: IndicesGetMappingIndexMappingRecord;
  mappingStatus: Status;
  query: string;
  results: SearchHit[];
  simplifiedMapping: Record<string, MappingProperty>;
  status: Status;
}

export const DocumentsLogic = kea<MakeLogicType<DocumentsLogicValues, DocumentsLogicActions>>({
  actions: {
    setSearchQuery: (query) => ({ query }),
  },
  connect: {
    actions: [
      SearchDocumentsApiLogic,
      ['apiReset', 'makeRequest'],
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
    openGenerateModal: () => {
      actions.apiReset();
    },
    setSearchQuery: async (_, breakpoint) => {
      await breakpoint(250);
      actions.makeRequest({ indexName: values.indexName, query: values.query });
    },
  }),
  path: ['enterprise_search', 'search_index', 'documents'],
  reducers: () => ({
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
      (status, mappingStatus) => status !== Status.SUCCESS && mappingStatus !== Status.SUCCESS,
    ],
    results: [
      () => [selectors.data, selectors.isLoading],
      (data: SearchResponseBody, isLoading) => {
        if (isLoading) return [];

        return data?.hits?.hits || [];
      },
    ],
    simplifiedMapping: [
      () => [selectors.mappingStatus, selectors.mappingData],
      (status: Status, mapping: IndicesGetMappingIndexMappingRecord) => {
        if (status !== Status.SUCCESS) return {};
        return mapping?.mappings?.properties;
      },
    ],
  }),
});
