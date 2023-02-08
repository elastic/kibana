/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { FieldConfiguration, SearchFieldConfiguration } from '@elastic/search-ui';

import { Status } from '../../../../../../common/types/api';
import { GenerateEngineApiKeyLogic } from '../../../api/generate_engine_api_key/generate_engine_api_key_logic';

interface EngineSearchPreviewActions {}

export interface EngineSearchPreviewLogicValues {
  resultFields: Record<string, FieldConfiguration>;
  searchableFields: Record<string, SearchFieldConfiguration>;
}

const fields = {
  resultFields: ['name'],
  searchableFields: ['name'],
};

export const EngineSearchPreviewLogic = kea<
  MakeLogicType<EngineSearchPreviewLogicValues, EngineSearchPreviewActions>
>({
  actions: {},
  connect: {},
  listeners: ({ actions }) => ({}),
  path: ['enterprise_search', 'content', 'engine_search_preview_logic'],
  reducers: () => ({
    resultFields: [
      fields.resultFields.reduce<EngineSearchPreviewLogicValues['resultFields']>(
        (acc, field) => ({
          ...acc,
          [field]: {
            raw: {},
            snippet: {},
          },
        }),
        {}
      ),
    ],
    searchableFields: [
      fields.searchableFields.reduce<EngineSearchPreviewLogicValues['searchableFields']>(
        (acc, field) => ({
          ...acc,
          [field]: {
            weight: 1,
          },
        }),
        {}
      ),
    ],
  }),
  selectors: ({ selectors }) => ({}),
});
