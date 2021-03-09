/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildThresholdQuery } from './build_threshold_query_aggs';

describe('build_threshold_query_agg', () => {
  it('should build expected query for pre-7.12 rules', () => {
    const query = buildThresholdQuery({
      threshold: {
        field: 'host.name',
        value: 100,
      },
      timestampOverride: undefined,
    });
    expect(query).toEqual(
      expect.objectContaining({
        aggregations: {
          'threshold_0:host.name': {
            terms: {
              field: 'host.name',
              min_doc_count: 100,
              size: 10000,
            },
            aggs: {
              top_threshold_hits: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: [
                    {
                      field: '*',
                      include_unmapped: true,
                    },
                  ],
                  size: 1,
                },
              },
            },
          },
        },
      })
    );
  });

  it('should generate a signal for pre-7.12 rules with no threshold field', () => {
    const query = buildThresholdQuery({
      threshold: {
        field: '',
        value: 100,
      },
      timestampOverride: undefined,
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          threshold_0: {
            terms: {
              script: {
                source: '""',
                lang: 'painless',
              },
              min_doc_count: 100,
            },
            aggs: {
              top_threshold_hits: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: [
                    {
                      field: '*',
                      include_unmapped: true,
                    },
                  ],
                  size: 1,
                },
              },
            },
          },
        },
      })
    );
  });

  it('should build expected query when only a value is provided', () => {
    const query = buildThresholdQuery({
      threshold: {
        field: [],
        value: 100,
      },
      timestampOverride: undefined,
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          threshold_0: {
            terms: {
              script: {
                source: '""',
                lang: 'painless',
              },
              min_doc_count: 100,
            },
            aggs: {
              top_threshold_hits: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: [
                    {
                      field: '*',
                      include_unmapped: true,
                    },
                  ],
                  size: 1,
                },
              },
            },
          },
        },
      })
    );
  });

  it('should build expected query when a field and value are provided', () => {
    const query = buildThresholdQuery({
      threshold: {
        field: ['host.name'],
        value: 100,
      },
      timestampOverride: undefined,
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          'threshold_0:host.name': {
            terms: {
              field: 'host.name',
              min_doc_count: 100,
              size: 10000,
            },
            aggs: {
              top_threshold_hits: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: [
                    {
                      field: '*',
                      include_unmapped: true,
                    },
                  ],
                  size: 1,
                },
              },
            },
          },
        },
      })
    );
  });

  it('should build expected query when multiple fields and a value are provided', () => {
    const query = buildThresholdQuery({
      threshold: {
        field: ['host.name', 'user.name'],
        value: 100,
      },
      timestampOverride: undefined,
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          'threshold_0:host.name': {
            terms: {
              field: 'host.name',
              min_doc_count: 100,
              size: 10000,
            },
            aggs: {
              'threshold_1:user.name': {
                terms: {
                  field: 'user.name',
                  min_doc_count: 100,
                  size: 10000,
                },
                aggs: {
                  top_threshold_hits: {
                    top_hits: {
                      sort: [
                        {
                          '@timestamp': {
                            order: 'desc',
                          },
                        },
                      ],
                      fields: [
                        {
                          field: '*',
                          include_unmapped: true,
                        },
                      ],
                      size: 1,
                    },
                  },
                },
              },
            },
          },
        },
      })
    );
  });

  it('should build expected query query when multiple fields, a value, and cardinality field/value are provided', () => {
    const query = buildThresholdQuery({
      threshold: {
        field: ['host.name', 'user.name'],
        value: 100,
        cardinality: [
          {
            field: 'destination.ip',
            value: 2,
          },
        ],
      },
      timestampOverride: undefined,
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          'threshold_0:host.name': {
            terms: {
              field: 'host.name',
              min_doc_count: 100,
              size: 10000,
            },
            aggs: {
              'threshold_1:user.name': {
                terms: {
                  field: 'user.name',
                  min_doc_count: 100,
                  size: 10000,
                },
                aggs: {
                  cardinality_count: {
                    cardinality: {
                      field: 'destination.ip',
                    },
                  },
                  cardinality_check: {
                    bucket_selector: {
                      buckets_path: {
                        cardinalityCount: 'cardinality_count',
                      },
                      script: 'params.cardinalityCount >= 2',
                    },
                  },
                  top_threshold_hits: {
                    top_hits: {
                      sort: [
                        {
                          '@timestamp': {
                            order: 'desc',
                          },
                        },
                      ],
                      fields: [
                        {
                          field: '*',
                          include_unmapped: true,
                        },
                      ],
                      size: 1,
                    },
                  },
                },
              },
            },
          },
        },
      })
    );
  });

  it('should build expected query query when only a value and a cardinality field/value are provided', () => {
    const query = buildThresholdQuery({
      threshold: {
        cardinality: [
          {
            field: 'source.ip',
            value: 5,
          },
        ],
        field: [],
        value: 200,
      },
      timestampOverride: undefined,
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregations: {
          threshold_0: {
            terms: {
              script: {
                source: '""',
                lang: 'painless',
              },
              min_doc_count: 200,
            },
            aggs: {
              cardinality_count: {
                cardinality: {
                  field: 'source.ip',
                },
              },
              cardinality_check: {
                bucket_selector: {
                  buckets_path: {
                    cardinalityCount: 'cardinality_count',
                  },
                  script: 'params.cardinalityCount >= 5',
                },
              },
              top_threshold_hits: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: [
                    {
                      field: '*',
                      include_unmapped: true,
                    },
                  ],
                  size: 1,
                },
              },
            },
          },
        },
      })
    );
  });
});
