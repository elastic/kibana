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

    const config = buildSearchUIConfig(connector, schema);
    expect(config.apiConnector).toEqual(connector);
    expect(config.searchQuery.result_fields).toEqual({
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
    });
  });
});
