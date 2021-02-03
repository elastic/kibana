/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SchemaTypes } from '../../../../shared/types';

import { buildSearchUIConfig } from './build_search_ui_config';

describe('buildSearchUIConfig', () => {
  it('builds a configuration object for Search UI', () => {
    const connector = {};
    const schema = {
      foo: 'text' as SchemaTypes,
      bar: 'number' as SchemaTypes,
    };
    const fields = {
      filterFields: ['fieldA', 'fieldB'],
      sortFields: [],
    };

    const config = buildSearchUIConfig(connector, schema, fields);
    expect(config).toEqual({
      alwaysSearchOnInitialLoad: true,
      apiConnector: connector,
      initialState: {
        sortDirection: 'desc',
        sortField: 'id',
      },
      searchQuery: {
        disjunctiveFacets: ['fieldA', 'fieldB'],
        facets: {
          fieldA: {
            size: 30,
            type: 'value',
          },
          fieldB: {
            size: 30,
            type: 'value',
          },
        },
        result_fields: {
          bar: {
            raw: {},
            snippet: {
              fallback: true,
              size: 300,
            },
          },
          foo: {
            raw: {},
            snippet: {
              fallback: true,
              size: 300,
            },
          },
        },
      },
      trackUrlState: false,
    });
  });
});
