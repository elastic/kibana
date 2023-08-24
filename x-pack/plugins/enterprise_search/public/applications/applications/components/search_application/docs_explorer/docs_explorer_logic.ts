/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { FieldConfiguration } from '@elastic/search-ui';

import { FetchSearchApplicationFieldCapabilitiesApiLogic } from '../../../api/search_applications/fetch_search_application_field_capabilities_api_logic';
import { SearchApplicationNameLogic } from '../search_application_name_logic';

interface SearchApplicationDocsExplorerActions {
  fetchSearchApplicationFieldCapabilities: typeof FetchSearchApplicationFieldCapabilitiesApiLogic.actions.makeRequest;
}

export interface SearchApplicationDocsExplorerValues {
  fieldTypesByIndex: Record<string, Record<string, string>>;
  resultFields: Record<string, FieldConfiguration>;
  searchApplicationFieldCapabilitiesData: typeof FetchSearchApplicationFieldCapabilitiesApiLogic.values.data;
  searchApplicationName: typeof SearchApplicationNameLogic.values.searchApplicationName;
  sortableFields: string[];
}

export const SearchApplicationDocsExplorerLogic = kea<
  MakeLogicType<SearchApplicationDocsExplorerValues, SearchApplicationDocsExplorerActions>
>({
  connect: {
    actions: [
      FetchSearchApplicationFieldCapabilitiesApiLogic,
      ['makeRequest as fetchSearchApplicationFieldCapabilities'],
    ],
    values: [
      SearchApplicationNameLogic,
      ['searchApplicationName'],
      FetchSearchApplicationFieldCapabilitiesApiLogic,
      ['data as searchApplicationFieldCapabilitiesData'],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      if (!values.searchApplicationFieldCapabilitiesData) {
        actions.fetchSearchApplicationFieldCapabilities({
          name: values.searchApplicationName,
        });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'search_application_docs_explorer_logic'],
  selectors: ({ selectors }) => ({
    fieldTypesByIndex: [
      () => [selectors.searchApplicationFieldCapabilitiesData],
      (data: SearchApplicationDocsExplorerValues['searchApplicationFieldCapabilitiesData']) => {
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
      () => [selectors.searchApplicationFieldCapabilitiesData],
      (data: SearchApplicationDocsExplorerValues['searchApplicationFieldCapabilitiesData']) => {
        if (!data) return {};

        return Object.fromEntries(
          data.fields
            .filter(({ metadata_field: isMeta }) => !isMeta)
            .map(({ name }) => [name, { raw: {}, snippet: { fallback: true } }])
        );
      },
    ],
    sortableFields: [
      () => [selectors.searchApplicationFieldCapabilitiesData],
      (data: SearchApplicationDocsExplorerValues['searchApplicationFieldCapabilitiesData']) => {
        if (!data) return [];

        return data.fields
          .filter(({ metadata_field: isMeta, aggregatable }) => aggregatable && !isMeta)
          .map(({ name }) => name)
          .sort();
      },
    ],
  }),
});
