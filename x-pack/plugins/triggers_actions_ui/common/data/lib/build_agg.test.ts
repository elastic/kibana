/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAggregation } from './build_agg';

describe('buildAgg', () => {
  describe('count over all (aggType = count and termField is undefined)', () => {
    it('should create correct aggregation when condition params are undefined and timeSeries is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'count',
          aggField: undefined,
          termField: undefined,
          termSize: undefined,
        })
      ).toEqual({
        dateAgg: {
          date_range: {
            field: 'time-field',
            format: 'strict_date_time',
            ranges: [
              {
                from: '2021-04-22T15:14:31.000Z',
                to: '2021-04-22T15:19:31.000Z',
              },
              {
                from: '2021-04-22T15:15:31.000Z',
                to: '2021-04-22T15:20:31.000Z',
              },
            ],
          },
        },
      });
    });

    it('should create correct aggregation when condition params are undefined and timeSeries is undefined', async () => {
      expect(
        buildAggregation({
          aggType: 'count',
          aggField: undefined,
          termField: undefined,
          termSize: undefined,
        })
      ).toEqual({});
    });

    it('should create correct aggregation when condition params are defined and timeSeries is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'count',
          aggField: undefined,
          termField: undefined,
          termSize: undefined,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({
        dateAgg: {
          date_range: {
            field: 'time-field',
            format: 'strict_date_time',
            ranges: [
              {
                from: '2021-04-22T15:14:31.000Z',
                to: '2021-04-22T15:19:31.000Z',
              },
              {
                from: '2021-04-22T15:15:31.000Z',
                to: '2021-04-22T15:20:31.000Z',
              },
            ],
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and timeSeries is undefined', async () => {
      expect(
        buildAggregation({
          aggType: 'count',
          aggField: undefined,
          termField: undefined,
          termSize: undefined,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({});
    });

    it('should not add top hits aggregation even if topHitsSize is specified', async () => {
      expect(
        buildAggregation({
          aggType: 'count',
          aggField: undefined,
          termField: undefined,
          termSize: undefined,
          topHitsSize: 10,
        })
      ).toEqual({});
    });
  });

  describe('count over top N termField (aggType = count and termField is specified)', () => {
    it('should create correct aggregation when condition params are undefined and timeSeries is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'count',
          aggField: undefined,
          termField: 'the-term',
          termSize: 10,
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-term',
            size: 10,
          },
          aggs: {
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
            },
          },
        },
      });
    });

    it('should create correct aggregation when condition params are undefined and timeSeries is undefined', async () => {
      expect(
        buildAggregation({
          aggType: 'count',
          aggField: undefined,
          termField: 'the-term',
          termSize: 10,
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-term',
            size: 10,
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and timeSeries is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'count',
          aggField: undefined,
          termField: 'the-term',
          termSize: 10,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-term',
            size: 10,
          },
          aggs: {
            conditionSelector: {
              bucket_selector: {
                buckets_path: {
                  compareValue: '_count',
                },
                script: `params.compareValue > 1`,
              },
            },
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
            },
          },
        },
        groupAggCount: {
          stats_bucket: {
            buckets_path: 'groupAgg._count',
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and timeSeries is defined and multi terms selected', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'count',
          aggField: undefined,
          termField: ['the-term', 'second-term'],
          termSize: 10,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({
        groupAgg: {
          multi_terms: {
            size: 10,
            terms: [{ field: 'the-term' }, { field: 'second-term' }],
          },
          aggs: {
            conditionSelector: {
              bucket_selector: {
                buckets_path: {
                  compareValue: '_count',
                },
                script: `params.compareValue > 1`,
              },
            },
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
            },
          },
        },
        groupAggCount: {
          stats_bucket: {
            buckets_path: 'groupAgg._count',
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and timeSeries is undefined', async () => {
      expect(
        buildAggregation({
          aggType: 'count',
          aggField: undefined,
          termField: 'the-term',
          termSize: 10,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-term',
            size: 10,
          },
          aggs: {
            conditionSelector: {
              bucket_selector: {
                buckets_path: {
                  compareValue: '_count',
                },
                script: `params.compareValue > 1`,
              },
            },
          },
        },
        groupAggCount: {
          stats_bucket: {
            buckets_path: 'groupAgg._count',
          },
        },
      });
    });

    it('should add top hits aggregation if topHitsSize is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'count',
          aggField: undefined,
          termField: 'the-term',
          termSize: 10,
          topHitsSize: 15,
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-term',
            size: 10,
          },
          aggs: {
            topHitsAgg: {
              top_hits: {
                size: 15,
              },
            },
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
            },
          },
        },
      });
    });
  });

  describe('aggregate metric over all (aggType != count and termField is undefined)', () => {
    it('should create correct aggregation when condition params are undefined and timeSeries is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'avg',
          aggField: 'avg-field',
          termField: undefined,
          termSize: undefined,
        })
      ).toEqual({
        dateAgg: {
          date_range: {
            field: 'time-field',
            format: 'strict_date_time',
            ranges: [
              {
                from: '2021-04-22T15:14:31.000Z',
                to: '2021-04-22T15:19:31.000Z',
              },
              {
                from: '2021-04-22T15:15:31.000Z',
                to: '2021-04-22T15:20:31.000Z',
              },
            ],
          },
          aggs: {
            metricAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
        sortValueAgg: {
          avg: {
            field: 'avg-field',
          },
        },
      });
    });

    it('should create correct aggregation when condition params are undefined and timeSeries is undefined', async () => {
      expect(
        buildAggregation({
          aggType: 'avg',
          aggField: 'avg-field',
          termField: undefined,
          termSize: undefined,
        })
      ).toEqual({
        metricAgg: {
          avg: {
            field: 'avg-field',
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and timeSeries is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'avg',
          aggField: 'avg-field',
          termField: undefined,
          termSize: undefined,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({
        dateAgg: {
          date_range: {
            field: 'time-field',
            format: 'strict_date_time',
            ranges: [
              {
                from: '2021-04-22T15:14:31.000Z',
                to: '2021-04-22T15:19:31.000Z',
              },
              {
                from: '2021-04-22T15:15:31.000Z',
                to: '2021-04-22T15:20:31.000Z',
              },
            ],
          },
          aggs: {
            metricAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
        sortValueAgg: {
          avg: {
            field: 'avg-field',
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and timeSeries is undefined', async () => {
      expect(
        buildAggregation({
          aggType: 'avg',
          aggField: 'avg-field',
          termField: undefined,
          termSize: undefined,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({
        metricAgg: {
          avg: {
            field: 'avg-field',
          },
        },
      });
    });

    it('should not add top hits aggregation even if topHitsSize is specified', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'avg',
          aggField: 'avg-field',
          termField: undefined,
          termSize: undefined,
        })
      ).toEqual({
        dateAgg: {
          date_range: {
            field: 'time-field',
            format: 'strict_date_time',
            ranges: [
              {
                from: '2021-04-22T15:14:31.000Z',
                to: '2021-04-22T15:19:31.000Z',
              },
              {
                from: '2021-04-22T15:15:31.000Z',
                to: '2021-04-22T15:20:31.000Z',
              },
            ],
          },
          aggs: {
            metricAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
        sortValueAgg: {
          avg: {
            field: 'avg-field',
          },
        },
      });
    });
  });

  describe('aggregate metric over top N termField (aggType != count and termField is specified)', () => {
    it('should create correct aggregation when condition params are undefined and timeSeries is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'avg',
          aggField: 'avg-field',
          termField: 'the-field',
          termSize: 20,
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-field',
            order: {
              sortValueAgg: 'desc',
            },
            size: 20,
          },
          aggs: {
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
              aggs: {
                metricAgg: {
                  avg: {
                    field: 'avg-field',
                  },
                },
              },
            },
            sortValueAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
      });
    });

    it('should create correct aggregation when condition params are undefined and timeSeries is undefined', async () => {
      expect(
        buildAggregation({
          aggType: 'avg',
          aggField: 'avg-field',
          termField: 'the-field',
          termSize: 20,
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-field',
            order: {
              metricAgg: 'desc',
            },
            size: 20,
          },
          aggs: {
            metricAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and timeSeries is defined', async () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'avg',
          aggField: 'avg-field',
          termField: 'the-field',
          termSize: 20,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-field',
            order: {
              sortValueAgg: 'desc',
            },
            size: 20,
          },
          aggs: {
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
              aggs: {
                metricAgg: {
                  avg: {
                    field: 'avg-field',
                  },
                },
              },
            },
            conditionSelector: {
              bucket_selector: {
                buckets_path: {
                  compareValue: 'sortValueAgg',
                },
                script: 'params.compareValue > 1',
              },
            },
            sortValueAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
        groupAggCount: {
          stats_bucket: {
            buckets_path: 'groupAgg._count',
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and timeSeries is undefined', async () => {
      expect(
        buildAggregation({
          aggType: 'avg',
          aggField: 'avg-field',
          termField: 'the-field',
          termSize: 20,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue > 1`,
          },
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-field',
            order: {
              metricAgg: 'desc',
            },
            size: 20,
          },
          aggs: {
            conditionSelector: {
              bucket_selector: {
                buckets_path: {
                  compareValue: 'metricAgg',
                },
                script: 'params.compareValue > 1',
              },
            },
            metricAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
        groupAggCount: {
          stats_bucket: {
            buckets_path: 'groupAgg._count',
          },
        },
      });
    });

    it('should create correct aggregation when condition params are defined and multi terms selected', async () => {
      expect(
        buildAggregation({
          aggType: 'sum',
          aggField: 'avg-field',
          termField: ['the-term', 'second-term'],
          termSize: 100,
          condition: {
            resultLimit: 1000,
            conditionScript: `params.compareValue <= 0`,
          },
        })
      ).toEqual({
        groupAgg: {
          multi_terms: {
            size: 100,
            terms: [{ field: 'the-term' }, { field: 'second-term' }],
            order: {
              metricAgg: 'desc',
            },
          },
          aggs: {
            conditionSelector: {
              bucket_selector: {
                buckets_path: {
                  compareValue: 'metricAgg',
                },
                script: `params.compareValue <= 0`,
              },
            },
            metricAgg: {
              sum: {
                field: 'avg-field',
              },
            },
          },
        },
        groupAggCount: {
          stats_bucket: {
            buckets_path: 'groupAgg._count',
          },
        },
      });
    });

    it('should add topHitsAgg if topHitsSize is defined', () => {
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'avg',
          aggField: 'avg-field',
          termField: 'the-field',
          termSize: 20,
          topHitsSize: 15,
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-field',
            order: {
              sortValueAgg: 'desc',
            },
            size: 20,
          },
          aggs: {
            topHitsAgg: {
              top_hits: {
                size: 15,
              },
            },
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
              aggs: {
                metricAgg: {
                  avg: {
                    field: 'avg-field',
                  },
                },
              },
            },
            sortValueAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
      });
    });

    it('should limit size of topHitsAgg', () => {
      let returnedMessage: string | undefined;
      expect(
        buildAggregation({
          timeSeries: {
            timeField: 'time-field',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            dateStart: '2021-04-22T15:19:31Z',
            dateEnd: '2021-04-22T15:20:31Z',
            interval: '1m',
          },
          aggType: 'avg',
          aggField: 'avg-field',
          termField: 'the-field',
          termSize: 20,
          topHitsSize: 150,
          loggerCb: (message: string) => (returnedMessage = message),
        })
      ).toEqual({
        groupAgg: {
          terms: {
            field: 'the-field',
            order: {
              sortValueAgg: 'desc',
            },
            size: 20,
          },
          aggs: {
            topHitsAgg: {
              top_hits: {
                size: 100,
              },
            },
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
              aggs: {
                metricAgg: {
                  avg: {
                    field: 'avg-field',
                  },
                },
              },
            },
            sortValueAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
        },
      });

      expect(returnedMessage).toEqual(`Top hits size is capped at 100`);
    });
  });

  it('should correctly apply the resultLimit if specified', async () => {
    expect(
      buildAggregation({
        timeSeries: {
          timeField: 'time-field',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          dateStart: '2021-04-22T15:19:31Z',
          dateEnd: '2021-04-22T15:20:31Z',
          interval: '1m',
        },
        aggType: 'count',
        aggField: undefined,
        termField: 'the-term',
        termSize: 100,
        condition: {
          resultLimit: 5,
          conditionScript: `params.compareValue > 1`,
        },
      })
    ).toEqual({
      groupAgg: {
        terms: {
          field: 'the-term',
          size: 6,
        },
        aggs: {
          conditionSelector: {
            bucket_selector: {
              buckets_path: {
                compareValue: '_count',
              },
              script: `params.compareValue > 1`,
            },
          },
          dateAgg: {
            date_range: {
              field: 'time-field',
              format: 'strict_date_time',
              ranges: [
                {
                  from: '2021-04-22T15:14:31.000Z',
                  to: '2021-04-22T15:19:31.000Z',
                },
                {
                  from: '2021-04-22T15:15:31.000Z',
                  to: '2021-04-22T15:20:31.000Z',
                },
              ],
            },
          },
        },
      },
      groupAggCount: {
        stats_bucket: {
          buckets_path: 'groupAgg._count',
        },
      },
    });
  });

  it('should correctly apply the sourceFieldsParams if specified', async () => {
    expect(
      buildAggregation({
        timeSeries: {
          timeField: 'time-field',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          dateStart: '2021-04-22T15:19:31Z',
          dateEnd: '2021-04-22T15:20:31Z',
          interval: '1m',
        },
        aggType: 'count',
        aggField: undefined,
        termField: 'the-term',
        termSize: 100,
        condition: {
          conditionScript: `params.compareValue > 1`,
        },
        sourceFieldsParams: [
          { label: 'host.hostname', searchPath: 'host.hostname.keyword' },
          { label: 'host.id', searchPath: 'host.id.keyword' },
          { label: 'host.name', searchPath: 'host.name.keyword' },
        ],
      })
    ).toEqual({
      groupAgg: {
        terms: {
          field: 'the-term',
          size: 100,
        },
        aggs: {
          conditionSelector: {
            bucket_selector: {
              buckets_path: {
                compareValue: '_count',
              },
              script: `params.compareValue > 1`,
            },
          },
          dateAgg: {
            date_range: {
              field: 'time-field',
              format: 'strict_date_time',
              ranges: [
                {
                  from: '2021-04-22T15:14:31.000Z',
                  to: '2021-04-22T15:19:31.000Z',
                },
                {
                  from: '2021-04-22T15:15:31.000Z',
                  to: '2021-04-22T15:20:31.000Z',
                },
              ],
            },
          },
          'host.hostname': {
            terms: {
              field: 'host.hostname.keyword',
              size: 10,
            },
          },
          'host.id': {
            terms: {
              field: 'host.id.keyword',
              size: 10,
            },
          },
          'host.name': {
            terms: {
              field: 'host.name.keyword',
              size: 10,
            },
          },
        },
      },
      groupAggCount: {
        stats_bucket: {
          buckets_path: 'groupAgg._count',
        },
      },
    });
  });

  it('should correctly apply the sourceFieldsParams if specified on a grouped query', async () => {
    expect(
      buildAggregation({
        aggType: 'avg',
        aggField: 'event.duration',
        termField: 'event.action',
        termSize: 10,
        sourceFieldsParams: [{ label: 'event.provider', searchPath: 'event.provider' }],
        condition: { resultLimit: 1000, conditionScript: 'params.compareValue > -1L' },
        topHitsSize: 100,
      })
    ).toEqual({
      groupAgg: {
        aggs: {
          conditionSelector: {
            bucket_selector: {
              buckets_path: {
                compareValue: 'metricAgg',
              },
              script: 'params.compareValue > -1L',
            },
          },
          'event.provider': {
            terms: {
              field: 'event.provider',
              size: 10,
            },
          },
          metricAgg: {
            avg: {
              field: 'event.duration',
            },
          },
          topHitsAgg: {
            top_hits: {
              size: 100,
            },
          },
        },
        terms: {
          field: 'event.action',
          order: {
            metricAgg: 'desc',
          },
          size: 10,
        },
      },
      groupAggCount: {
        stats_bucket: {
          buckets_path: 'groupAgg._count',
        },
      },
    });
  });
});
