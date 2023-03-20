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

interface EngineSearchPreviewActions {
  fetchEngineFieldCapabilities: typeof FetchEngineFieldCapabilitiesApiLogic.actions.makeRequest;
}

export interface EngineSearchPreviewValues {
  engineFieldCapabilitiesData: typeof FetchEngineFieldCapabilitiesApiLogic.values.data;
  engineName: typeof EngineNameLogic.values.engineName;
  resultFields: Record<string, FieldConfiguration>;
  searchableFields: Record<string, SearchFieldConfiguration>;
  sortableFields: string[];
}

export const EngineSearchPreviewLogic = kea<
  MakeLogicType<EngineSearchPreviewValues, EngineSearchPreviewActions>
>({
  connect: {
    actions: [
      FetchEngineFieldCapabilitiesApiLogic,
      ['makeRequest as fetchEngineFieldCapabilities'],
    ],
    values: [
      EngineNameLogic,
      ['engineName'],
      FetchEngineFieldCapabilitiesApiLogic,
      ['data as engineFieldCapabilitiesData'],
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
  path: ['enterprise_search', 'content', 'engine_search_preview_logic'],
  selectors: ({ selectors }) => ({
    resultFields: [
      () => [selectors.engineFieldCapabilitiesData],
      (data: EngineSearchPreviewValues['engineFieldCapabilitiesData']) => {
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
    searchableFields: [
      () => [selectors.engineFieldCapabilitiesData],
      (data: EngineSearchPreviewValues['engineFieldCapabilitiesData']) => {
        if (!data) return {};

        const searchableFields = Object.fromEntries(
          Object.entries(data.field_capabilities.fields)
            .filter(([, mappings]) =>
              Object.entries(mappings).some(
                ([type, { metadata_field: isMeta, searchable: isSearchable }]) =>
                  type === 'text' && !isMeta && isSearchable
              )
            )
            .map(([key]) => [key, { weight: 1 }])
        );

        return searchableFields;
      },
    ],
    sortableFields: [
      () => [selectors.engineFieldCapabilitiesData],
      (data: EngineSearchPreviewValues['engineFieldCapabilitiesData']) => {
        if (!data) return [];

        return Object.entries(data.field_capabilities.fields)
          .filter(([, mappings]) =>
            Object.entries(mappings).some(
              ([, { metadata_field: isMeta, aggregatable }]) =>
                // Aggregatable are also _sortable_
                aggregatable && !isMeta
            )
          )
          .map(([field]) => field)
          .sort();
      },
    ],
  }),
});
