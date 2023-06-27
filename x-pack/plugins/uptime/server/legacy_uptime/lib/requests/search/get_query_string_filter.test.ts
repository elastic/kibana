/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryStringFilter } from './get_query_string_filter';

describe('get_query_string_filter', () => {
  it('should return query string filter', () => {
    expect(getQueryStringFilter('test')).toEqual({
      query_string: {
        query: '*test* or tags:test*',
        fields: [
          'monitor.id.text',
          'monitor.name.text',
          'url.full.text',
          'synthetics.step.name',
          'synthetics.journey.name',
        ],
      },
    });
  });

  it('port filter in case query is number', () => {
    expect(getQueryStringFilter('443')).toEqual({
      query_string: {
        query: 'url.port:443 or 443',
        fields: [
          'monitor.id.text',
          'monitor.name.text',
          'url.full.text',
          'synthetics.step.name',
          'synthetics.journey.name',
        ],
      },
    });
  });

  it('do not wrap if it already has reserved char', () => {
    expect(getQueryStringFilter('test*')).toEqual({
      query_string: {
        query: 'test*',
        fields: [
          'monitor.id.text',
          'monitor.name.text',
          'url.full.text',
          'synthetics.step.name',
          'synthetics.journey.name',
        ],
      },
    });
  });
});
