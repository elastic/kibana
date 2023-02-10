/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { FieldConfiguration, SearchFieldConfiguration } from '@elastic/search-ui';

import { FetchEngineFieldCapabilitiesApiLogic } from '../../../api/engines/fetch_engine_field_capabilities_api_logic';
import { EngineNameLogic } from '../engine_name_logic';

// interface EngineSearchPreviewActions {}

export interface EngineSearchPreviewLogicValues {
  resultFields: Record<string, FieldConfiguration>;
  searchableFields: Record<string, SearchFieldConfiguration>;
}

export const EngineSearchPreviewLogic = kea<MakeLogicType<EngineSearchPreviewLogicValues, {}>>({
  actions: {},
  connect: {
    actions: [
      FetchEngineFieldCapabilitiesApiLogic,
      ['makeRequest as fetchEngineFieldCapabilities'],
    ],
    values: [
      EngineNameLogic,
      ['engineName'],
      FetchEngineFieldCapabilitiesApiLogic,
      ['data as engineFieldCapabilitiesData', 'status as engineFieldCapabilitiesStatus'],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      if (!values.engineFieldCapabilitiesData) {
        actions.fetchEngineFieldCapabilities({
          engineName: values.engineName,
        });
      }
    },
  }),
  // listeners: ({ actions }) => ({}),
  path: ['enterprise_search', 'content', 'engine_search_preview_logic'],
  selectors: ({ selectors }) => ({
    resultFields: [
      () => [selectors.engineFieldCapabilitiesData],
      (data) => {
        if (!data) return {};

        const resultFields = Object.fromEntries(
          Object.entries(data.field_capabilities.fields)
            .filter(([, mappings]) => {
              return Object.values(mappings).some(({ metadata_field: isMeta }) => !isMeta);
            })
            .map(([key]) => {
              return [key, { raw: {}, snippet: {} }];
            })
        );

        return resultFields;
      },
    ],
    searchableFields: [() => [selectors.engineFieldCapabilitiesData], () => ({})],
  }),
});
