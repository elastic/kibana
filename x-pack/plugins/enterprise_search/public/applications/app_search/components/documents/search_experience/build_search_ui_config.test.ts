/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIConnector } from '@elastic/search-ui';

import { SchemaType } from '../../../../shared/schema/types';

import { buildSearchUIConfig } from './build_search_ui_config';

describe('buildSearchUIConfig', () => {
  it('builds a configuration object for Search UI', () => {
    const connector = {};
    const schema = {
      foo: {
        type: SchemaType.Text,
        capabilities: {
          snippet: true,
          facet: true,
        },
      },
      bar: {
        type: SchemaType.Number,
        capabilities: {
          snippet: false,
          facet: false,
        },
      },
    };
    const fields = {
      filterFields: ['foo', 'bar'],
      sortFields: [],
    };

    const config = buildSearchUIConfig(connector as APIConnector, schema, fields);
    expect(config).toEqual({
      alwaysSearchOnInitialLoad: true,
      apiConnector: connector,
      initialState: {
        sortDirection: 'desc',
        sortField: 'id',
      },
      searchQuery: {
        disjunctiveFacets: ['foo'],
        facets: {
          foo: {
            size: 30,
            type: 'value',
          },
        },
        result_fields: {
          bar: {
            raw: {},
          },
          foo: {
            raw: {},
            snippet: {
              size: 300,
            },
          },
        },
      },
      trackUrlState: false,
    });
  });
});
