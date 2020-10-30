/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UniqueID } from './unique_id';

describe('UniqueID test', () => {
  it('returns zero nodes for an empty aggregations response', () => {
    const id = new UniqueID({
      edges: [
        {
          id: 'process.entity_id',
          parentID: 'process.parent.entity_id',
        },
      ],
    });

    const emptyAggs = {
      'process.entity_id': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
    };
    expect(id.getNodesFromAggs(emptyAggs)).toEqual([]);
  });

  it('returns zero nodes for an empty aggregations response with multiple parts to the edges schema', () => {
    const id = new UniqueID({
      edges: [
        {
          id: 'process.entity_id',
          parentID: 'process.parent.entity_id',
        },
        {
          id: 'host.id',
          parentID: 'host.id',
        },
      ],
    });

    const emptyAggs = {
      'process.entity_id': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
    };
    expect(id.getNodesFromAggs(emptyAggs)).toEqual([]);
  });

  it('returns multiple nodes for a single schema definition and multiple buckets', () => {
    const id = new UniqueID({
      edges: [
        {
          id: 'process.entity_id',
          parentID: 'process.parent.entity_id',
        },
      ],
    });

    const aggs = {
      'process.entity_id': {
        buckets: [
          {
            key: 'a',
            singleEvent: {
              hits: {
                hits: [{ _source: { field: 'a' } }],
              },
            },
          },
          {
            key: 'b',
            singleEvent: {
              hits: {
                hits: [{ _source: { field: 'b' } }],
              },
            },
          },
        ],
      },
    };
    expect(id.getNodesFromAggs(aggs)).toEqual([{ field: 'a' }, { field: 'b' }]);
  });

  it('returns multiple nodes with multiple parts to the edges schema', () => {
    const id = new UniqueID({
      edges: [
        {
          id: 'process.entity_id',
          parentID: 'process.parent.entity_id',
        },
        {
          id: 'host.id',
          parentID: 'host.id',
        },
      ],
    });

    const aggs = {
      'process.entity_id': {
        buckets: [
          {
            key: 'a',
            'host.id': {
              buckets: [
                {
                  key: 'a',
                  singleEvent: {
                    hits: {
                      hits: [{ _source: { field: 'a' } }],
                    },
                  },
                },
                {
                  key: 'b',
                  singleEvent: {
                    hits: {
                      hits: [{ _source: { field: 'b' } }],
                    },
                  },
                },
              ],
            },
          },
          {
            key: 'c',
            'host.id': {
              buckets: [
                {
                  key: 'c',
                  singleEvent: {
                    hits: {
                      hits: [{ _source: { field: 'c' } }],
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    };
    expect(id.getNodesFromAggs(aggs)).toEqual([{ field: 'a' }, { field: 'b' }, { field: 'c' }]);
  });

  it('returns nodes when one of the buckets is empty', () => {
    const id = new UniqueID({
      edges: [
        {
          id: 'process.entity_id',
          parentID: 'process.parent.entity_id',
        },
        {
          id: 'host.id',
          parentID: 'host.id',
        },
      ],
    });

    const aggs = {
      'process.entity_id': {
        buckets: [
          {
            key: 'a',
            'host.id': {
              buckets: [
                {
                  key: 'a',
                  singleEvent: {
                    hits: {
                      hits: [{ _source: { field: 'a' } }],
                    },
                  },
                },
                {
                  key: 'b',
                  singleEvent: {
                    hits: {
                      hits: [{ _source: { field: 'b' } }],
                    },
                  },
                },
              ],
            },
          },
          {
            key: 'c',
            'host.id': {
              buckets: [],
            },
          },
        ],
      },
    };
    expect(id.getNodesFromAggs(aggs)).toEqual([{ field: 'a' }, { field: 'b' }]);
  });

  it('handles an undefined aggregation', () => {
    const id = new UniqueID({
      edges: [
        {
          id: 'process.entity_id',
          parentID: 'process.parent.entity_id',
        },
      ],
    });

    const aggs = {
      blah: {
        buckets: [],
      },
    };
    expect(id.getNodesFromAggs(aggs)).toEqual([]);
  });

  it('handles an undefined nested aggregation', () => {
    const id = new UniqueID({
      edges: [
        {
          id: 'process.entity_id',
          parentID: 'process.parent.entity_id',
        },
        {
          id: 'host.id',
          parentID: 'host.id',
        },
      ],
    });

    const aggs = {
      'process.entity_id': {
        buckets: [
          {
            key: 'a',
            'host.doesnotexist': {
              buckets: [
                {
                  key: 'a',
                  singleEvent: {
                    hits: {
                      hits: [{ _source: { field: 'a' } }],
                    },
                  },
                },
                {
                  key: 'b',
                  singleEvent: {
                    hits: {
                      hits: [{ _source: { field: 'b' } }],
                    },
                  },
                },
              ],
            },
          },
          {
            key: 'c',
            'host.doesnotexist': {
              buckets: [],
            },
          },
        ],
      },
    };
    expect(id.getNodesFromAggs(aggs)).toEqual([]);
  });
});
