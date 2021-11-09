/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEventEnrichmentRequestOptionsMock } from '../../../../../../common/search_strategy/security_solution/cti/index.mock';
import { buildEventEnrichmentQuery } from './query';

describe('buildEventEnrichmentQuery', () => {
  it('converts each event field/value into a named filter', () => {
    const options = buildEventEnrichmentRequestOptionsMock();
    const query = buildEventEnrichmentQuery(options);
    expect(query.body?.query?.bool?.should).toEqual(
      expect.arrayContaining([
        {
          match: {
            'threat.indicator.file.hash.md5': {
              _name: 'file.hash.md5',
              query: '1eee2bf3f56d8abed72da2bc523e7431',
            },
          },
        },
        { match: { 'threat.indicator.ip': { _name: 'source.ip', query: '127.0.0.1' } } },
        { match: { 'threat.indicator.url.full': { _name: 'url.full', query: 'elastic.co' } } },
      ])
    );
  });

  it('filters on indicator events', () => {
    const options = buildEventEnrichmentRequestOptionsMock();
    const query = buildEventEnrichmentQuery(options);
    expect(query.body?.query?.bool?.filter).toEqual(
      expect.arrayContaining([{ term: { 'event.type': 'indicator' } }])
    );
  });

  it('includes the specified timerange', () => {
    const options = buildEventEnrichmentRequestOptionsMock();
    const query = buildEventEnrichmentQuery(options);
    expect(query.body?.query?.bool?.filter).toEqual(
      expect.arrayContaining([
        {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '2020-09-13T09:00:43.249Z',
              lte: '2020-09-14T09:00:43.249Z',
            },
          },
        },
      ])
    );
  });

  it('includes specified docvalue_fields', () => {
    const docValueFields = [
      { field: '@timestamp', format: 'date_time' },
      { field: 'event.created', format: 'date_time' },
      { field: 'event.end', format: 'date_time' },
    ];
    const options = buildEventEnrichmentRequestOptionsMock({ docValueFields });
    const query = buildEventEnrichmentQuery(options);
    expect(query.body?.docvalue_fields).toEqual(expect.arrayContaining(docValueFields));
  });

  it('requests all fields', () => {
    const options = buildEventEnrichmentRequestOptionsMock();
    const query = buildEventEnrichmentQuery(options);
    expect(query.body?.fields).toEqual(['*']);
  });

  it('excludes _source', () => {
    const options = buildEventEnrichmentRequestOptionsMock();
    const query = buildEventEnrichmentQuery(options);
    expect(query.body?._source).toEqual(false);
  });

  it('includes specified filters', () => {
    const filterQuery = {
      query: 'query_field: query_value',
      language: 'kuery',
    };

    const options = buildEventEnrichmentRequestOptionsMock({ filterQuery });
    const query = buildEventEnrichmentQuery(options);
    expect(query.body?.query?.bool?.filter).toEqual(expect.arrayContaining([filterQuery]));
  });
});
