/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { FieldConfiguration } from '@elastic/search-ui';

import { FetchEngineFieldCapabilitiesApiLogic } from '../../../api/engines/fetch_engine_field_capabilities_api_logic';
import { EngineNameLogic } from '../engine_name_logic';

interface EngineSearchPreviewActions {
  fetchEngineFieldCapabilities: typeof FetchEngineFieldCapabilitiesApiLogic.actions.makeRequest;
}

export interface EngineSearchPreviewValues {
  engineFieldCapabilitiesData: typeof FetchEngineFieldCapabilitiesApiLogic.values.data;
  engineName: typeof EngineNameLogic.values.engineName;
  fieldTypesByIndex: Record<string, Record<string, string>>;
  resultFields: Record<string, FieldConfiguration>;
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
    fieldTypesByIndex: [
      () => [selectors.engineFieldCapabilitiesData],
      (data: EngineSearchPreviewValues['engineFieldCapabilitiesData']) => {
        if (!data) return {};

        return data.fields.reduce(
          (out: Record<string, Record<string, string>>, field) =>
            field.indices.reduce(
              (acc: Record<string, Record<string, string>>, index) => ({
                ...acc,
                [index.name]: {
                  ...(acc[index.name] || {}),
                  [field.name]: index.type,
                },
              }),
              out
            ),
          {}
        );
      },
    ],
    resultFields: [
      () => [selectors.engineFieldCapabilitiesData],
      (data: EngineSearchPreviewValues['engineFieldCapabilitiesData']) => {
        if (!data) return {};

        return Object.fromEntries(
          data.fields
            .filter(({ metadata_field: isMeta }) => !isMeta)
            .map(({ name }) => [name, { raw: {}, snippet: { fallback: true } }])
        );
      },
    ],
    sortableFields: [
      () => [selectors.engineFieldCapabilitiesData],
      (data: EngineSearchPreviewValues['engineFieldCapabilitiesData']) => {
        if (!data) return [];

        return data.fields
          .filter(({ metadata_field: isMeta, aggregatable }) => aggregatable && !isMeta)
          .map(({ name }) => name)
          .sort();
      },
    ],
  }),
});
