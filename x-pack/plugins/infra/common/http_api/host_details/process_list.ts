/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MetricsAPISeriesRT, MetricsAPIRow } from '../metrics_api';

const AggValueRT = rt.type({
  value: rt.number,
});

export const ProcessListAPIRequestRT = rt.type({
  hostTerm: rt.record(rt.string, rt.string),
  indexPattern: rt.string,
  to: rt.number,
  sortBy: rt.type({
    name: rt.string,
    isAscending: rt.boolean,
  }),
  searchFilter: rt.array(rt.record(rt.string, rt.record(rt.string, rt.unknown))),
});

export const ProcessListAPIQueryAggregationRT = rt.type({
  summaryEvent: rt.type({
    summary: rt.type({
      hits: rt.type({
        hits: rt.array(
          rt.type({
            _source: rt.type({
              system: rt.type({
                process: rt.type({
                  summary: rt.record(rt.string, rt.number),
                }),
              }),
            }),
          })
        ),
      }),
    }),
  }),
  processes: rt.type({
    filteredProcs: rt.type({
      buckets: rt.array(
        rt.type({
          key: rt.string,
          cpu: AggValueRT,
          memory: AggValueRT,
          startTime: rt.type({
            value_as_string: rt.string,
          }),
          meta: rt.type({
            hits: rt.type({
              hits: rt.array(
                rt.type({
                  _source: rt.type({
                    process: rt.type({
                      pid: rt.number,
                    }),
                    system: rt.type({
                      process: rt.type({
                        state: rt.string,
                      }),
                    }),
                    user: rt.type({
                      name: rt.string,
                    }),
                  }),
                })
              ),
            }),
          }),
        })
      ),
    }),
  }),
});

export const ProcessListAPIResponseRT = rt.type({
  processList: rt.array(
    rt.type({
      cpu: rt.number,
      memory: rt.number,
      startTime: rt.number,
      pid: rt.number,
      state: rt.string,
      user: rt.string,
      command: rt.string,
    })
  ),
  summary: rt.record(rt.string, rt.number),
});

export type ProcessListAPIQueryAggregation = rt.TypeOf<typeof ProcessListAPIQueryAggregationRT>;

export type ProcessListAPIRequest = rt.TypeOf<typeof ProcessListAPIRequestRT>;

export type ProcessListAPIResponse = rt.TypeOf<typeof ProcessListAPIResponseRT>;

export const ProcessListAPIChartRequestRT = rt.type({
  hostTerm: rt.record(rt.string, rt.string),
  indexPattern: rt.string,
  to: rt.number,
  command: rt.string,
});

export const ProcessListAPIChartQueryAggregationRT = rt.type({
  process: rt.type({
    filteredProc: rt.type({
      buckets: rt.array(
        rt.type({
          timeseries: rt.type({
            buckets: rt.array(
              rt.type({
                key: rt.number,
                memory: AggValueRT,
                cpu: AggValueRT,
              })
            ),
          }),
        })
      ),
    }),
  }),
});

export const ProcessListAPIChartResponseRT = rt.type({
  cpu: MetricsAPISeriesRT,
  memory: MetricsAPISeriesRT,
});

export type ProcessListAPIChartQueryAggregation = rt.TypeOf<
  typeof ProcessListAPIChartQueryAggregationRT
>;

export type ProcessListAPIChartRequest = rt.TypeOf<typeof ProcessListAPIChartRequestRT>;

export type ProcessListAPIChartResponse = rt.TypeOf<typeof ProcessListAPIChartResponseRT>;

export type ProcessListAPIRow = MetricsAPIRow;
