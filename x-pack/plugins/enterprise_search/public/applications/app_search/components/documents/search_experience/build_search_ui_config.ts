/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Schema } from '../../../../shared/schema/types';

import { Fields } from './types';

export const buildSearchUIConfig = (
  apiConnector: object,
  schema: Schema,
  fields: Fields,
  initialState = { sortDirection: 'desc', sortField: 'id' }
) => {
  const facets = fields.filterFields.reduce(
    (facetsConfig, fieldName) => ({
      ...facetsConfig,
      [fieldName]: { type: 'value', size: 30 },
    }),
    {}
  );

  return {
    alwaysSearchOnInitialLoad: true,
    apiConnector,
    trackUrlState: false,
    initialState,
    searchQuery: {
      disjunctiveFacets: fields.filterFields,
      facets,
      result_fields: Object.keys(schema).reduce((acc: { [key: string]: object }, key: string) => {
        acc[key] = {
          snippet: {
            size: 300,
            fallback: true,
          },
          raw: {},
        };
        return acc;
      }, {}),
    },
  };
};
