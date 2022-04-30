/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEventEnrichmentRequestOptionsMock,
  buildEventEnrichmentRawResponseMock,
} from '../../../../../../common/search_strategy/security_solution/cti/index.mock';
import { parseEventEnrichmentResponse } from './response';

describe('parseEventEnrichmentResponse', () => {
  it('includes an accurate inspect response', async () => {
    const options = buildEventEnrichmentRequestOptionsMock();
    const response = buildEventEnrichmentRawResponseMock();
    const parsedResponse = await parseEventEnrichmentResponse(options, response);

    const expectedInspect = expect.objectContaining({
      allow_no_indices: true,
      body: {
        _source: false,
        fields: ['*'],
        query: {
          bool: {
            filter: [
              { bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } },
              { term: { 'event.type': 'indicator' } },
              {
                range: {
                  '@timestamp': {
                    format: 'strict_date_optional_time',
                    gte: '2020-09-13T09:00:43.249Z',
                    lte: '2020-09-14T09:00:43.249Z',
                  },
                },
              },
            ],
            minimum_should_match: 1,
            should: [
              {
                match: {
                  'threat.indicator.file.hash.md5': {
                    _name: 'file.hash.md5',
                    query: '1eee2bf3f56d8abed72da2bc523e7431',
                  },
                },
              },
              { match: { 'threat.indicator.ip': { _name: 'source.ip', query: '127.0.0.1' } } },
              {
                match: {
                  'threat.indicator.url.full': { _name: 'url.full', query: 'elastic.co' },
                },
              },
            ],
          },
        },
      },
      ignore_unavailable: true,
      index: ['filebeat-*'],
    });
    const parsedInspect = JSON.parse(parsedResponse.inspect.dsl[0]);
    expect(parsedInspect).toEqual(expectedInspect);
  });

  it('includes an accurate total count', async () => {
    const options = buildEventEnrichmentRequestOptionsMock();
    const response = buildEventEnrichmentRawResponseMock();
    const parsedResponse = await parseEventEnrichmentResponse(options, response);

    expect(parsedResponse.totalCount).toEqual(1);
  });

  it('adds matched.* enrichment fields based on the named query', async () => {
    const options = buildEventEnrichmentRequestOptionsMock();
    const response = buildEventEnrichmentRawResponseMock();
    const parsedResponse = await parseEventEnrichmentResponse(options, response);

    expect(parsedResponse.enrichments).toEqual([
      expect.objectContaining({
        'matched.atomic': ['5529de7b60601aeb36f57824ed0e1ae8'],
        'matched.field': ['file.hash.md5'],
        'matched.id': ['31408415b6d5601a92d29b86c2519658f210c194057588ae396d55cc20b3f03d'],
        'matched.index': ['filebeat-8.0.0-2021.05.28-000001'],
      }),
    ]);
  });
});
