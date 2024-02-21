/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getServiceGroupFields,
  getServiceGroupFieldsAgg,
  flattenSourceDoc,
} from './get_service_group_fields';

const mockSourceObj = {
  service: {
    name: 'testbeans',
    environment: 'testing',
    language: {
      name: 'typescript',
    },
  },
  labels: {
    team: 'test',
  },
  agent: {
    name: 'nodejs',
  },
};

const mockSourceObj2 = {
  ...mockSourceObj,
  labels: {
    team: ['test1', 'test2'],
  },
};

const mockBucket = {
  source_fields: {
    hits: {
      hits: [{ _source: mockSourceObj }],
    },
  },
};

const mockBucket2 = {
  source_fields: {
    hits: {
      hits: [{ _source: mockSourceObj2 }],
    },
  },
};

describe('getSourceFields', () => {
  it('should return a flattened record of fields and values for a given bucket except for labels', () => {
    const result = getServiceGroupFields(mockBucket);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "agent.name": "nodejs",
        "labels": Object {
          "team": "test",
        },
        "service.environment": "testing",
        "service.language.name": "typescript",
        "service.name": "testbeans",
      }
    `);
  });

  it('should not flatten labels', () => {
    const result = getServiceGroupFields(mockBucket2);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "agent.name": "nodejs",
        "labels": Object {
          "team": Array [
            "test1",
            "test2",
          ],
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
    const agg = getServiceGroupFieldsAgg();
    expect(agg).toMatchInlineSnapshot(`
      Object {
        "source_fields": Object {
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
    const agg = getServiceGroupFieldsAgg({
      sort: [{ 'transaction.duration.us': { order: 'desc' } }],
    });
    expect(agg).toMatchInlineSnapshot(`
      Object {
        "source_fields": Object {
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
    const result = flattenSourceDoc(mockSourceObj);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "agent.name": "nodejs",
        "labels": Object {
          "team": "test",
        },
        "service.environment": "testing",
        "service.language.name": "typescript",
        "service.name": "testbeans",
      }
    `);
  });

  it('should not flatten labels', () => {
    const result = flattenSourceDoc(mockSourceObj2);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "agent.name": "nodejs",
        "labels": Object {
          "team": Array [
            "test1",
            "test2",
          ],
        },
        "service.environment": "testing",
        "service.language.name": "typescript",
        "service.name": "testbeans",
      }
    `);
  });
});
