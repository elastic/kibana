/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationResultOf } from '@kbn/es-types';
import {
  getApmAlertSourceFields,
  getApmAlertSourceFieldsAgg,
  flattenSourceDoc,
} from './get_apm_alert_source_fields';

const topHitsMock = {
  service: {
    name: 'testbeans',
    environment: 'testing',
    language: {
      name: 'typescript',
    },
  },
  labels: {
    team: 'test',
    event: ['event-0', 'event-1'],
  },
  agent: {
    name: 'nodejs',
  },
};

type TermsAggResult = AggregationResultOf<{ terms: any }, unknown>;

const aggregationResponseMock = {
  top_hit_source_fields: {
    hits: {
      hits: [{ _source: topHitsMock }],
    },
  },
  'container.id': {
    buckets: [{ key: 'my-first-container' }, { key: 'my-second-container' }],
  } as TermsAggResult,
  'host.name': {
    buckets: [{ key: 'my-only-host' }],
  } as TermsAggResult,
};

describe('getSourceFields', () => {
  it('should return a flattened record of fields and values for a given bucket except for labels', () => {
    const result = getApmAlertSourceFields(aggregationResponseMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "agent.name": "nodejs",
        "container.id": Array [
          "my-first-container",
          "my-second-container",
        ],
        "host.name": Array [
          "my-only-host",
        ],
        "labels": Object {
          "event": Array [
            "event-0",
            "event-1",
          ],
          "team": "test",
        },
        "service.environment": "testing",
        "service.language.name": "typescript",
        "service.name": "testbeans",
      }
    `);
  });
});

describe('getSourceFieldsAgg', () => {
  it('should create a agg for specific source fields', () => {
    const agg = getApmAlertSourceFieldsAgg();
    expect(agg).toMatchInlineSnapshot(`
      Object {
        "container.id": Object {
          "terms": Object {
            "field": "container.id",
            "size": 10,
          },
        },
        "host.name": Object {
          "terms": Object {
            "field": "host.name",
            "size": 10,
          },
        },
        "top_hit_source_fields": Object {
          "top_hits": Object {
            "_source": Object {
              "includes": Array [
                "agent.name",
                "service.name",
                "service.environment",
                "service.language.name",
                "labels",
              ],
            },
            "size": 1,
          },
        },
      }
    `);
  });

  it('should accept options for top_hits options', () => {
    const agg = getApmAlertSourceFieldsAgg({
      sort: [{ 'transaction.duration.us': { order: 'desc' } }],
    });
    expect(agg).toMatchInlineSnapshot(`
      Object {
        "container.id": Object {
          "terms": Object {
            "field": "container.id",
            "size": 10,
          },
        },
        "host.name": Object {
          "terms": Object {
            "field": "host.name",
            "size": 10,
          },
        },
        "top_hit_source_fields": Object {
          "top_hits": Object {
            "_source": Object {
              "includes": Array [
                "agent.name",
                "service.name",
                "service.environment",
                "service.language.name",
                "labels",
              ],
            },
            "size": 1,
            "sort": Array [
              Object {
                "transaction.duration.us": Object {
                  "order": "desc",
                },
              },
            ],
          },
        },
      }
    `);
  });
});

describe('flattenSourceDoc', () => {
  it('should flatten a given nested object with dot delim paths as keys except for labels', () => {
    const result = flattenSourceDoc(topHitsMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "agent.name": "nodejs",
        "labels": Object {
          "event": Array [
            "event-0",
            "event-1",
          ],
          "team": "test",
        },
        "service.environment": "testing",
        "service.language.name": "typescript",
        "service.name": "testbeans",
      }
    `);
  });
});
