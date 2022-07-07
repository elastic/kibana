/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIConnector, SortDirection } from '@elastic/search-ui';

import { Schema } from '../../../../shared/schema/types';

import { Fields } from './types';

export const buildSearchUIConfig = (
  apiConnector: APIConnector,
  schema: Schema,
  fields: Fields,
  initialState = { sortDirection: 'desc' as SortDirection, sortField: 'id' }
) => {
  const facets = fields.filterFields.reduce((facetsConfig, fieldName) => {
    // Geolocation fields do not support value facets https://www.elastic.co/guide/en/app-search/current/facets.html
    if (schema[fieldName] === 'geolocation') {
      return facetsConfig;
    }
    return {
      ...facetsConfig,
      [fieldName]: { type: 'value', size: 30 },
    };
  }, {});

  return {
    alwaysSearchOnInitialLoad: true,
    apiConnector,
    trackUrlState: false,
    initialState,
    searchQuery: {
      disjunctiveFacets: fields.filterFields,
      facets,
      result_fields: Object.keys(schema).reduce((acc: { [key: string]: object }, key: string) => {
        if (schema[key] === 'text') {
          // Only text fields support snippets
          acc[key] = {
            snippet: {
              size: 300,
              fallback: true,
            },
            raw: {},
          };
        } else {
          acc[key] = {
            raw: {},
          };
        }
        return acc;
      }, {}),
    },
  };
};
