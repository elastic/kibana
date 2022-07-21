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

interface DocumentsLogicActions {
  apiReset: typeof SearchDocumentsApiLogic.actions.apiReset;
  makeMappingRequest: typeof MappingsApiLogic.actions.makeRequest;
  makeRequest: typeof SearchDocumentsApiLogic.actions.makeRequest;
}

interface DocumentsLogicValues {
  data: typeof SearchDocumentsApiLogic.values.data;
  isLoading: boolean;
  mappingData: IndicesGetMappingIndexMappingRecord;
  mappingStatus: Status;
  results: SearchHit[];
  simplifiedMapping: Record<string, MappingProperty>;
  status: Status;
}

export const DocumentsLogic = kea<MakeLogicType<DocumentsLogicValues, DocumentsLogicActions>>({
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
    ],
  },
  listeners: ({ actions }) => ({
    openGenerateModal: () => {
      actions.apiReset();
    },
  }),
  path: ['enterprise_search', 'search_index', 'documents'],
  reducers: () => ({}),
  selectors: ({ selectors }) => ({
    isLoading: [
      () => [selectors.status, selectors.mappingStatus],
      (status, mappingStatus) => status !== Status.SUCCESS && mappingStatus !== Status.SUCCESS,
    ],
    results: [
      () => [selectors.data, selectors.isLoading],
      (data: SearchResponseBody, isLoading) => {
        if (isLoading) return [];

        const a = data?.hits?.hits || [];
        return a;
      },
    ],
    simplifiedMapping: [
      () => [selectors.mappingStatus, selectors.mappingData],
      (status: Status, mapping: IndicesGetMappingIndexMappingRecord) => {
        if (status !== Status.SUCCESS) return {};

        const retVal = mapping?.mappings?.properties;
        return retVal;
      },
    ],
  }),
});
