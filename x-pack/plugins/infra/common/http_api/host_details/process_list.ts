/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const ProcessListAPIRequestRT = rt.type({
  hostTerm: rt.record(rt.string, rt.string),
  timefield: rt.string,
  indexPattern: rt.string,
  to: rt.number,
  sortBy: rt.type({
    name: rt.string,
    isAscending: rt.boolean,
  }),
  searchFilter: rt.array(rt.record(rt.string, rt.record(rt.string, rt.unknown))),
});

export const ProcessListAPIQueryAggregationRT = rt.type({
  processCount: rt.type({
    value: rt.number,
  }),
  states: rt.type({
    buckets: rt.array(
      rt.type({
        key: rt.string,
        count: rt.type({
          value: rt.number,
        }),
      })
    ),
  }),
  processes: rt.type({
    filteredProcs: rt.type({
      buckets: rt.array(
        rt.type({
          key: rt.string,
          cpu: rt.type({
            value: rt.number,
          }),
          memory: rt.type({
            value: rt.number,
          }),
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
    })
  ),
  summary: rt.type({
    total: rt.number,
    statesCount: rt.record(rt.string, rt.number),
  }),
});

export type ProcessListAPIQueryAggregation = rt.TypeOf<typeof ProcessListAPIQueryAggregationRT>;

export type ProcessListAPIRequest = rt.TypeOf<typeof ProcessListAPIRequestRT>;

export type ProcessListAPIResponse = rt.TypeOf<typeof ProcessListAPIResponseRT>;
