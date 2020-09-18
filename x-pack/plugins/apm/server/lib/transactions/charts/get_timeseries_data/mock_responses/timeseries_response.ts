/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from '../fetcher';

export const timeseriesResponse = ({
  took: 206,
  timed_out: false,
  _shards: {
    total: 9,
    successful: 9,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 10000,
      relation: 'gte',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    transaction_results: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'A Custom Bucket (that should be last)',
          doc_count: 0,
          timeseries: { buckets: [] },
        },
        {
          key: 'HTTP 2xx',
          doc_count: 12150,
          timeseries: {
            buckets: [
              {
                key_as_string: '2020-07-04T08:40:00.000Z',
                key: 1593852000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T08:50:00.000Z',
                key: 1593852600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:00:00.000Z',
                key: 1593853200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:10:00.000Z',
                key: 1593853800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:20:00.000Z',
                key: 1593854400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:30:00.000Z',
                key: 1593855000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:40:00.000Z',
                key: 1593855600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:50:00.000Z',
                key: 1593856200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:00:00.000Z',
                key: 1593856800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:10:00.000Z',
                key: 1593857400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:20:00.000Z',
                key: 1593858000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:30:00.000Z',
                key: 1593858600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:40:00.000Z',
                key: 1593859200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:50:00.000Z',
                key: 1593859800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:00:00.000Z',
                key: 1593860400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:10:00.000Z',
                key: 1593861000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:20:00.000Z',
                key: 1593861600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:30:00.000Z',
                key: 1593862200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:40:00.000Z',
                key: 1593862800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:50:00.000Z',
                key: 1593863400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:00:00.000Z',
                key: 1593864000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:10:00.000Z',
                key: 1593864600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:20:00.000Z',
                key: 1593865200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:30:00.000Z',
                key: 1593865800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:40:00.000Z',
                key: 1593866400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:50:00.000Z',
                key: 1593867000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:00:00.000Z',
                key: 1593867600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:10:00.000Z',
                key: 1593868200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:20:00.000Z',
                key: 1593868800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:30:00.000Z',
                key: 1593869400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:40:00.000Z',
                key: 1593870000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:50:00.000Z',
                key: 1593870600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:00:00.000Z',
                key: 1593871200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:10:00.000Z',
                key: 1593871800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:20:00.000Z',
                key: 1593872400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:30:00.000Z',
                key: 1593873000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:40:00.000Z',
                key: 1593873600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:50:00.000Z',
                key: 1593874200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:00:00.000Z',
                key: 1593874800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:10:00.000Z',
                key: 1593875400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:20:00.000Z',
                key: 1593876000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:30:00.000Z',
                key: 1593876600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:40:00.000Z',
                key: 1593877200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:50:00.000Z',
                key: 1593877800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:00:00.000Z',
                key: 1593878400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:10:00.000Z',
                key: 1593879000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:20:00.000Z',
                key: 1593879600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:30:00.000Z',
                key: 1593880200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:40:00.000Z',
                key: 1593880800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:50:00.000Z',
                key: 1593881400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:00:00.000Z',
                key: 1593882000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:10:00.000Z',
                key: 1593882600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:20:00.000Z',
                key: 1593883200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:30:00.000Z',
                key: 1593883800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:40:00.000Z',
                key: 1593884400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:50:00.000Z',
                key: 1593885000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:00:00.000Z',
                key: 1593885600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:10:00.000Z',
                key: 1593886200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:20:00.000Z',
                key: 1593886800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:30:00.000Z',
                key: 1593887400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:40:00.000Z',
                key: 1593888000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:50:00.000Z',
                key: 1593888600000,
                doc_count: 169,
                count: {
                  value: 169,
                },
              },
              {
                key_as_string: '2020-07-04T19:00:00.000Z',
                key: 1593889200000,
                doc_count: 444,
                count: {
                  value: 444,
                },
              },
              {
                key_as_string: '2020-07-04T19:10:00.000Z',
                key: 1593889800000,
                doc_count: 460,
                count: {
                  value: 460,
                },
              },
              {
                key_as_string: '2020-07-04T19:20:00.000Z',
                key: 1593890400000,
                doc_count: 506,
                count: {
                  value: 506,
                },
              },
              {
                key_as_string: '2020-07-04T19:30:00.000Z',
                key: 1593891000000,
                doc_count: 479,
                count: {
                  value: 479,
                },
              },
              {
                key_as_string: '2020-07-04T19:40:00.000Z',
                key: 1593891600000,
                doc_count: 457,
                count: {
                  value: 457,
                },
              },
              {
                key_as_string: '2020-07-04T19:50:00.000Z',
                key: 1593892200000,
                doc_count: 514,
                count: {
                  value: 514,
                },
              },
              {
                key_as_string: '2020-07-04T20:00:00.000Z',
                key: 1593892800000,
                doc_count: 482,
                count: {
                  value: 482,
                },
              },
              {
                key_as_string: '2020-07-04T20:10:00.000Z',
                key: 1593893400000,
                doc_count: 504,
                count: {
                  value: 504,
                },
              },
              {
                key_as_string: '2020-07-04T20:20:00.000Z',
                key: 1593894000000,
                doc_count: 532,
                count: {
                  value: 532,
                },
              },
              {
                key_as_string: '2020-07-04T20:30:00.000Z',
                key: 1593894600000,
                doc_count: 458,
                count: {
                  value: 458,
                },
              },
              {
                key_as_string: '2020-07-04T20:40:00.000Z',
                key: 1593895200000,
                doc_count: 448,
                count: {
                  value: 448,
                },
              },
              {
                key_as_string: '2020-07-04T20:50:00.000Z',
                key: 1593895800000,
                doc_count: 468,
                count: {
                  value: 468,
                },
              },
              {
                key_as_string: '2020-07-04T21:00:00.000Z',
                key: 1593896400000,
                doc_count: 526,
                count: {
                  value: 526,
                },
              },
              {
                key_as_string: '2020-07-04T21:10:00.000Z',
                key: 1593897000000,
                doc_count: 495,
                count: {
                  value: 495,
                },
              },
              {
                key_as_string: '2020-07-04T21:20:00.000Z',
                key: 1593897600000,
                doc_count: 492,
                count: {
                  value: 492,
                },
              },
              {
                key_as_string: '2020-07-04T21:30:00.000Z',
                key: 1593898200000,
                doc_count: 487,
                count: {
                  value: 487,
                },
              },
              {
                key_as_string: '2020-07-04T21:40:00.000Z',
                key: 1593898800000,
                doc_count: 491,
                count: {
                  value: 491,
                },
              },
              {
                key_as_string: '2020-07-04T21:50:00.000Z',
                key: 1593899400000,
                doc_count: 486,
                count: {
                  value: 486,
                },
              },
              {
                key_as_string: '2020-07-04T22:00:00.000Z',
                key: 1593900000000,
                doc_count: 458,
                count: {
                  value: 458,
                },
              },
              {
                key_as_string: '2020-07-04T22:10:00.000Z',
                key: 1593900600000,
                doc_count: 528,
                count: {
                  value: 528,
                },
              },
              {
                key_as_string: '2020-07-04T22:20:00.000Z',
                key: 1593901200000,
                doc_count: 467,
                count: {
                  value: 467,
                },
              },
              {
                key_as_string: '2020-07-04T22:30:00.000Z',
                key: 1593901800000,
                doc_count: 179,
                count: {
                  value: 179,
                },
              },
              {
                key_as_string: '2020-07-04T22:40:00.000Z',
                key: 1593902400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T22:50:00.000Z',
                key: 1593903000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:00:00.000Z',
                key: 1593903600000,
                doc_count: 39,
                count: {
                  value: 39,
                },
              },
              {
                key_as_string: '2020-07-04T23:10:00.000Z',
                key: 1593904200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:20:00.000Z',
                key: 1593904800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:30:00.000Z',
                key: 1593905400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:40:00.000Z',
                key: 1593906000000,
                doc_count: 36,
                count: {
                  value: 36,
                },
              },
              {
                key_as_string: '2020-07-04T23:50:00.000Z',
                key: 1593906600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:00:00.000Z',
                key: 1593907200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:10:00.000Z',
                key: 1593907800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:20:00.000Z',
                key: 1593908400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:30:00.000Z',
                key: 1593909000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:40:00.000Z',
                key: 1593909600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:50:00.000Z',
                key: 1593910200000,
                doc_count: 34,
                count: {
                  value: 34,
                },
              },
              {
                key_as_string: '2020-07-05T01:00:00.000Z',
                key: 1593910800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:10:00.000Z',
                key: 1593911400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:20:00.000Z',
                key: 1593912000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:30:00.000Z',
                key: 1593912600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:40:00.000Z',
                key: 1593913200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:50:00.000Z',
                key: 1593913800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:00:00.000Z',
                key: 1593914400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:10:00.000Z',
                key: 1593915000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:20:00.000Z',
                key: 1593915600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:30:00.000Z',
                key: 1593916200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:40:00.000Z',
                key: 1593916800000,
                doc_count: 31,
                count: {
                  value: 31,
                },
              },
              {
                key_as_string: '2020-07-05T02:50:00.000Z',
                key: 1593917400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:00:00.000Z',
                key: 1593918000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:10:00.000Z',
                key: 1593918600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:20:00.000Z',
                key: 1593919200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:30:00.000Z',
                key: 1593919800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:40:00.000Z',
                key: 1593920400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:50:00.000Z',
                key: 1593921000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:00:00.000Z',
                key: 1593921600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:10:00.000Z',
                key: 1593922200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:20:00.000Z',
                key: 1593922800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:30:00.000Z',
                key: 1593923400000,
                doc_count: 49,
                count: {
                  value: 49,
                },
              },
              {
                key_as_string: '2020-07-05T04:40:00.000Z',
                key: 1593924000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:50:00.000Z',
                key: 1593924600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:00:00.000Z',
                key: 1593925200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:10:00.000Z',
                key: 1593925800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:20:00.000Z',
                key: 1593926400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:30:00.000Z',
                key: 1593927000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:40:00.000Z',
                key: 1593927600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:50:00.000Z',
                key: 1593928200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:00:00.000Z',
                key: 1593928800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:10:00.000Z',
                key: 1593929400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:20:00.000Z',
                key: 1593930000000,
                doc_count: 50,
                count: {
                  value: 50,
                },
              },
              {
                key_as_string: '2020-07-05T06:30:00.000Z',
                key: 1593930600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:40:00.000Z',
                key: 1593931200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:50:00.000Z',
                key: 1593931800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:00:00.000Z',
                key: 1593932400000,
                doc_count: 37,
                count: {
                  value: 37,
                },
              },
              {
                key_as_string: '2020-07-05T07:10:00.000Z',
                key: 1593933000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:20:00.000Z',
                key: 1593933600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:30:00.000Z',
                key: 1593934200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:40:00.000Z',
                key: 1593934800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:50:00.000Z',
                key: 1593935400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:00:00.000Z',
                key: 1593936000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:10:00.000Z',
                key: 1593936600000,
                doc_count: 194,
                count: {
                  value: 194,
                },
              },
              {
                key_as_string: '2020-07-05T08:20:00.000Z',
                key: 1593937200000,
                doc_count: 385,
                count: {
                  value: 385,
                },
              },
              {
                key_as_string: '2020-07-05T08:30:00.000Z',
                key: 1593937800000,
                doc_count: 421,
                count: {
                  value: 421,
                },
              },
              {
                key_as_string: '2020-07-05T08:40:00.000Z',
                key: 1593938400000,
                doc_count: 344,
                count: {
                  value: 344,
                },
              },
            ],
          },
        },
        {
          key: 'HTTP 3xx',
          doc_count: 3828,
          timeseries: {
            buckets: [
              {
                key_as_string: '2020-07-04T08:40:00.000Z',
                key: 1593852000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T08:50:00.000Z',
                key: 1593852600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:00:00.000Z',
                key: 1593853200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:10:00.000Z',
                key: 1593853800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:20:00.000Z',
                key: 1593854400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:30:00.000Z',
                key: 1593855000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:40:00.000Z',
                key: 1593855600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:50:00.000Z',
                key: 1593856200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:00:00.000Z',
                key: 1593856800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:10:00.000Z',
                key: 1593857400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:20:00.000Z',
                key: 1593858000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:30:00.000Z',
                key: 1593858600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:40:00.000Z',
                key: 1593859200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:50:00.000Z',
                key: 1593859800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:00:00.000Z',
                key: 1593860400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:10:00.000Z',
                key: 1593861000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:20:00.000Z',
                key: 1593861600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:30:00.000Z',
                key: 1593862200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:40:00.000Z',
                key: 1593862800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:50:00.000Z',
                key: 1593863400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:00:00.000Z',
                key: 1593864000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:10:00.000Z',
                key: 1593864600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:20:00.000Z',
                key: 1593865200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:30:00.000Z',
                key: 1593865800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:40:00.000Z',
                key: 1593866400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:50:00.000Z',
                key: 1593867000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:00:00.000Z',
                key: 1593867600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:10:00.000Z',
                key: 1593868200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:20:00.000Z',
                key: 1593868800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:30:00.000Z',
                key: 1593869400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:40:00.000Z',
                key: 1593870000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:50:00.000Z',
                key: 1593870600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:00:00.000Z',
                key: 1593871200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:10:00.000Z',
                key: 1593871800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:20:00.000Z',
                key: 1593872400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:30:00.000Z',
                key: 1593873000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:40:00.000Z',
                key: 1593873600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:50:00.000Z',
                key: 1593874200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:00:00.000Z',
                key: 1593874800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:10:00.000Z',
                key: 1593875400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:20:00.000Z',
                key: 1593876000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:30:00.000Z',
                key: 1593876600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:40:00.000Z',
                key: 1593877200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:50:00.000Z',
                key: 1593877800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:00:00.000Z',
                key: 1593878400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:10:00.000Z',
                key: 1593879000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:20:00.000Z',
                key: 1593879600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:30:00.000Z',
                key: 1593880200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:40:00.000Z',
                key: 1593880800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:50:00.000Z',
                key: 1593881400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:00:00.000Z',
                key: 1593882000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:10:00.000Z',
                key: 1593882600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:20:00.000Z',
                key: 1593883200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:30:00.000Z',
                key: 1593883800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:40:00.000Z',
                key: 1593884400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:50:00.000Z',
                key: 1593885000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:00:00.000Z',
                key: 1593885600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:10:00.000Z',
                key: 1593886200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:20:00.000Z',
                key: 1593886800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:30:00.000Z',
                key: 1593887400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:40:00.000Z',
                key: 1593888000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:50:00.000Z',
                key: 1593888600000,
                doc_count: 62,
                count: {
                  value: 62,
                },
              },
              {
                key_as_string: '2020-07-04T19:00:00.000Z',
                key: 1593889200000,
                doc_count: 52,
                count: {
                  value: 52,
                },
              },
              {
                key_as_string: '2020-07-04T19:10:00.000Z',
                key: 1593889800000,
                doc_count: 128,
                count: {
                  value: 128,
                },
              },
              {
                key_as_string: '2020-07-04T19:20:00.000Z',
                key: 1593890400000,
                doc_count: 143,
                count: {
                  value: 143,
                },
              },
              {
                key_as_string: '2020-07-04T19:30:00.000Z',
                key: 1593891000000,
                doc_count: 129,
                count: {
                  value: 129,
                },
              },
              {
                key_as_string: '2020-07-04T19:40:00.000Z',
                key: 1593891600000,
                doc_count: 121,
                count: {
                  value: 121,
                },
              },
              {
                key_as_string: '2020-07-04T19:50:00.000Z',
                key: 1593892200000,
                doc_count: 292,
                count: {
                  value: 292,
                },
              },
              {
                key_as_string: '2020-07-04T20:00:00.000Z',
                key: 1593892800000,
                doc_count: 139,
                count: {
                  value: 139,
                },
              },
              {
                key_as_string: '2020-07-04T20:10:00.000Z',
                key: 1593893400000,
                doc_count: 104,
                count: {
                  value: 104,
                },
              },
              {
                key_as_string: '2020-07-04T20:20:00.000Z',
                key: 1593894000000,
                doc_count: 198,
                count: {
                  value: 198,
                },
              },
              {
                key_as_string: '2020-07-04T20:30:00.000Z',
                key: 1593894600000,
                doc_count: 179,
                count: {
                  value: 179,
                },
              },
              {
                key_as_string: '2020-07-04T20:40:00.000Z',
                key: 1593895200000,
                doc_count: 117,
                count: {
                  value: 117,
                },
              },
              {
                key_as_string: '2020-07-04T20:50:00.000Z',
                key: 1593895800000,
                doc_count: 183,
                count: {
                  value: 183,
                },
              },
              {
                key_as_string: '2020-07-04T21:00:00.000Z',
                key: 1593896400000,
                doc_count: 264,
                count: {
                  value: 264,
                },
              },
              {
                key_as_string: '2020-07-04T21:10:00.000Z',
                key: 1593897000000,
                doc_count: 180,
                count: {
                  value: 180,
                },
              },
              {
                key_as_string: '2020-07-04T21:20:00.000Z',
                key: 1593897600000,
                doc_count: 160,
                count: {
                  value: 160,
                },
              },
              {
                key_as_string: '2020-07-04T21:30:00.000Z',
                key: 1593898200000,
                doc_count: 208,
                count: {
                  value: 208,
                },
              },
              {
                key_as_string: '2020-07-04T21:40:00.000Z',
                key: 1593898800000,
                doc_count: 158,
                count: {
                  value: 158,
                },
              },
              {
                key_as_string: '2020-07-04T21:50:00.000Z',
                key: 1593899400000,
                doc_count: 176,
                count: {
                  value: 176,
                },
              },
              {
                key_as_string: '2020-07-04T22:00:00.000Z',
                key: 1593900000000,
                doc_count: 183,
                count: {
                  value: 183,
                },
              },
              {
                key_as_string: '2020-07-04T22:10:00.000Z',
                key: 1593900600000,
                doc_count: 234,
                count: {
                  value: 234,
                },
              },
              {
                key_as_string: '2020-07-04T22:20:00.000Z',
                key: 1593901200000,
                doc_count: 125,
                count: {
                  value: 125,
                },
              },
              {
                key_as_string: '2020-07-04T22:30:00.000Z',
                key: 1593901800000,
                doc_count: 48,
                count: {
                  value: 48,
                },
              },
              {
                key_as_string: '2020-07-04T22:40:00.000Z',
                key: 1593902400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T22:50:00.000Z',
                key: 1593903000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:00:00.000Z',
                key: 1593903600000,
                doc_count: 9,
                count: {
                  value: 9,
                },
              },
              {
                key_as_string: '2020-07-04T23:10:00.000Z',
                key: 1593904200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:20:00.000Z',
                key: 1593904800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:30:00.000Z',
                key: 1593905400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:40:00.000Z',
                key: 1593906000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:50:00.000Z',
                key: 1593906600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:00:00.000Z',
                key: 1593907200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:10:00.000Z',
                key: 1593907800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:20:00.000Z',
                key: 1593908400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:30:00.000Z',
                key: 1593909000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:40:00.000Z',
                key: 1593909600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:50:00.000Z',
                key: 1593910200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:00:00.000Z',
                key: 1593910800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:10:00.000Z',
                key: 1593911400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:20:00.000Z',
                key: 1593912000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:30:00.000Z',
                key: 1593912600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:40:00.000Z',
                key: 1593913200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:50:00.000Z',
                key: 1593913800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:00:00.000Z',
                key: 1593914400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:10:00.000Z',
                key: 1593915000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:20:00.000Z',
                key: 1593915600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:30:00.000Z',
                key: 1593916200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:40:00.000Z',
                key: 1593916800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:50:00.000Z',
                key: 1593917400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:00:00.000Z',
                key: 1593918000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:10:00.000Z',
                key: 1593918600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:20:00.000Z',
                key: 1593919200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:30:00.000Z',
                key: 1593919800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:40:00.000Z',
                key: 1593920400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:50:00.000Z',
                key: 1593921000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:00:00.000Z',
                key: 1593921600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:10:00.000Z',
                key: 1593922200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:20:00.000Z',
                key: 1593922800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:30:00.000Z',
                key: 1593923400000,
                doc_count: 11,
                count: {
                  value: 11,
                },
              },
              {
                key_as_string: '2020-07-05T04:40:00.000Z',
                key: 1593924000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:50:00.000Z',
                key: 1593924600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:00:00.000Z',
                key: 1593925200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:10:00.000Z',
                key: 1593925800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:20:00.000Z',
                key: 1593926400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:30:00.000Z',
                key: 1593927000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:40:00.000Z',
                key: 1593927600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:50:00.000Z',
                key: 1593928200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:00:00.000Z',
                key: 1593928800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:10:00.000Z',
                key: 1593929400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:20:00.000Z',
                key: 1593930000000,
                doc_count: 28,
                count: {
                  value: 28,
                },
              },
              {
                key_as_string: '2020-07-05T06:30:00.000Z',
                key: 1593930600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:40:00.000Z',
                key: 1593931200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:50:00.000Z',
                key: 1593931800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:00:00.000Z',
                key: 1593932400000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
              {
                key_as_string: '2020-07-05T07:10:00.000Z',
                key: 1593933000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:20:00.000Z',
                key: 1593933600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:30:00.000Z',
                key: 1593934200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:40:00.000Z',
                key: 1593934800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:50:00.000Z',
                key: 1593935400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:00:00.000Z',
                key: 1593936000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:10:00.000Z',
                key: 1593936600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:20:00.000Z',
                key: 1593937200000,
                doc_count: 63,
                count: {
                  value: 63,
                },
              },
              {
                key_as_string: '2020-07-05T08:30:00.000Z',
                key: 1593937800000,
                doc_count: 50,
                count: {
                  value: 50,
                },
              },
              {
                key_as_string: '2020-07-05T08:40:00.000Z',
                key: 1593938400000,
                doc_count: 82,
                count: {
                  value: 82,
                },
              },
            ],
          },
        },
        {
          key: 'HTTP 4xx',
          doc_count: 683,
          timeseries: {
            buckets: [
              {
                key_as_string: '2020-07-04T08:40:00.000Z',
                key: 1593852000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T08:50:00.000Z',
                key: 1593852600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:00:00.000Z',
                key: 1593853200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:10:00.000Z',
                key: 1593853800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:20:00.000Z',
                key: 1593854400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:30:00.000Z',
                key: 1593855000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:40:00.000Z',
                key: 1593855600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:50:00.000Z',
                key: 1593856200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:00:00.000Z',
                key: 1593856800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:10:00.000Z',
                key: 1593857400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:20:00.000Z',
                key: 1593858000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:30:00.000Z',
                key: 1593858600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:40:00.000Z',
                key: 1593859200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:50:00.000Z',
                key: 1593859800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:00:00.000Z',
                key: 1593860400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:10:00.000Z',
                key: 1593861000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:20:00.000Z',
                key: 1593861600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:30:00.000Z',
                key: 1593862200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:40:00.000Z',
                key: 1593862800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:50:00.000Z',
                key: 1593863400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:00:00.000Z',
                key: 1593864000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:10:00.000Z',
                key: 1593864600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:20:00.000Z',
                key: 1593865200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:30:00.000Z',
                key: 1593865800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:40:00.000Z',
                key: 1593866400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:50:00.000Z',
                key: 1593867000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:00:00.000Z',
                key: 1593867600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:10:00.000Z',
                key: 1593868200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:20:00.000Z',
                key: 1593868800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:30:00.000Z',
                key: 1593869400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:40:00.000Z',
                key: 1593870000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:50:00.000Z',
                key: 1593870600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:00:00.000Z',
                key: 1593871200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:10:00.000Z',
                key: 1593871800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:20:00.000Z',
                key: 1593872400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:30:00.000Z',
                key: 1593873000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:40:00.000Z',
                key: 1593873600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:50:00.000Z',
                key: 1593874200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:00:00.000Z',
                key: 1593874800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:10:00.000Z',
                key: 1593875400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:20:00.000Z',
                key: 1593876000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:30:00.000Z',
                key: 1593876600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:40:00.000Z',
                key: 1593877200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:50:00.000Z',
                key: 1593877800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:00:00.000Z',
                key: 1593878400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:10:00.000Z',
                key: 1593879000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:20:00.000Z',
                key: 1593879600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:30:00.000Z',
                key: 1593880200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:40:00.000Z',
                key: 1593880800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:50:00.000Z',
                key: 1593881400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:00:00.000Z',
                key: 1593882000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:10:00.000Z',
                key: 1593882600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:20:00.000Z',
                key: 1593883200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:30:00.000Z',
                key: 1593883800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:40:00.000Z',
                key: 1593884400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:50:00.000Z',
                key: 1593885000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:00:00.000Z',
                key: 1593885600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:10:00.000Z',
                key: 1593886200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:20:00.000Z',
                key: 1593886800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:30:00.000Z',
                key: 1593887400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:40:00.000Z',
                key: 1593888000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:50:00.000Z',
                key: 1593888600000,
                doc_count: 11,
                count: {
                  value: 11,
                },
              },
              {
                key_as_string: '2020-07-04T19:00:00.000Z',
                key: 1593889200000,
                doc_count: 31,
                count: {
                  value: 31,
                },
              },
              {
                key_as_string: '2020-07-04T19:10:00.000Z',
                key: 1593889800000,
                doc_count: 19,
                count: {
                  value: 19,
                },
              },
              {
                key_as_string: '2020-07-04T19:20:00.000Z',
                key: 1593890400000,
                doc_count: 23,
                count: {
                  value: 23,
                },
              },
              {
                key_as_string: '2020-07-04T19:30:00.000Z',
                key: 1593891000000,
                doc_count: 26,
                count: {
                  value: 26,
                },
              },
              {
                key_as_string: '2020-07-04T19:40:00.000Z',
                key: 1593891600000,
                doc_count: 27,
                count: {
                  value: 27,
                },
              },
              {
                key_as_string: '2020-07-04T19:50:00.000Z',
                key: 1593892200000,
                doc_count: 27,
                count: {
                  value: 27,
                },
              },
              {
                key_as_string: '2020-07-04T20:00:00.000Z',
                key: 1593892800000,
                doc_count: 30,
                count: {
                  value: 30,
                },
              },
              {
                key_as_string: '2020-07-04T20:10:00.000Z',
                key: 1593893400000,
                doc_count: 28,
                count: {
                  value: 28,
                },
              },
              {
                key_as_string: '2020-07-04T20:20:00.000Z',
                key: 1593894000000,
                doc_count: 33,
                count: {
                  value: 33,
                },
              },
              {
                key_as_string: '2020-07-04T20:30:00.000Z',
                key: 1593894600000,
                doc_count: 23,
                count: {
                  value: 23,
                },
              },
              {
                key_as_string: '2020-07-04T20:40:00.000Z',
                key: 1593895200000,
                doc_count: 35,
                count: {
                  value: 35,
                },
              },
              {
                key_as_string: '2020-07-04T20:50:00.000Z',
                key: 1593895800000,
                doc_count: 26,
                count: {
                  value: 26,
                },
              },
              {
                key_as_string: '2020-07-04T21:00:00.000Z',
                key: 1593896400000,
                doc_count: 35,
                count: {
                  value: 35,
                },
              },
              {
                key_as_string: '2020-07-04T21:10:00.000Z',
                key: 1593897000000,
                doc_count: 25,
                count: {
                  value: 25,
                },
              },
              {
                key_as_string: '2020-07-04T21:20:00.000Z',
                key: 1593897600000,
                doc_count: 26,
                count: {
                  value: 26,
                },
              },
              {
                key_as_string: '2020-07-04T21:30:00.000Z',
                key: 1593898200000,
                doc_count: 25,
                count: {
                  value: 25,
                },
              },
              {
                key_as_string: '2020-07-04T21:40:00.000Z',
                key: 1593898800000,
                doc_count: 17,
                count: {
                  value: 17,
                },
              },
              {
                key_as_string: '2020-07-04T21:50:00.000Z',
                key: 1593899400000,
                doc_count: 19,
                count: {
                  value: 19,
                },
              },
              {
                key_as_string: '2020-07-04T22:00:00.000Z',
                key: 1593900000000,
                doc_count: 28,
                count: {
                  value: 28,
                },
              },
              {
                key_as_string: '2020-07-04T22:10:00.000Z',
                key: 1593900600000,
                doc_count: 24,
                count: {
                  value: 24,
                },
              },
              {
                key_as_string: '2020-07-04T22:20:00.000Z',
                key: 1593901200000,
                doc_count: 30,
                count: {
                  value: 30,
                },
              },
              {
                key_as_string: '2020-07-04T22:30:00.000Z',
                key: 1593901800000,
                doc_count: 6,
                count: {
                  value: 6,
                },
              },
              {
                key_as_string: '2020-07-04T22:40:00.000Z',
                key: 1593902400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T22:50:00.000Z',
                key: 1593903000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:00:00.000Z',
                key: 1593903600000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
              {
                key_as_string: '2020-07-04T23:10:00.000Z',
                key: 1593904200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:20:00.000Z',
                key: 1593904800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:30:00.000Z',
                key: 1593905400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:40:00.000Z',
                key: 1593906000000,
                doc_count: 4,
                count: {
                  value: 4,
                },
              },
              {
                key_as_string: '2020-07-04T23:50:00.000Z',
                key: 1593906600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:00:00.000Z',
                key: 1593907200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:10:00.000Z',
                key: 1593907800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:20:00.000Z',
                key: 1593908400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:30:00.000Z',
                key: 1593909000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:40:00.000Z',
                key: 1593909600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:50:00.000Z',
                key: 1593910200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:00:00.000Z',
                key: 1593910800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:10:00.000Z',
                key: 1593911400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:20:00.000Z',
                key: 1593912000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:30:00.000Z',
                key: 1593912600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:40:00.000Z',
                key: 1593913200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:50:00.000Z',
                key: 1593913800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:00:00.000Z',
                key: 1593914400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:10:00.000Z',
                key: 1593915000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:20:00.000Z',
                key: 1593915600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:30:00.000Z',
                key: 1593916200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:40:00.000Z',
                key: 1593916800000,
                doc_count: 3,
                count: {
                  value: 3,
                },
              },
              {
                key_as_string: '2020-07-05T02:50:00.000Z',
                key: 1593917400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:00:00.000Z',
                key: 1593918000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:10:00.000Z',
                key: 1593918600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:20:00.000Z',
                key: 1593919200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:30:00.000Z',
                key: 1593919800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:40:00.000Z',
                key: 1593920400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:50:00.000Z',
                key: 1593921000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:00:00.000Z',
                key: 1593921600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:10:00.000Z',
                key: 1593922200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:20:00.000Z',
                key: 1593922800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:30:00.000Z',
                key: 1593923400000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
              {
                key_as_string: '2020-07-05T04:40:00.000Z',
                key: 1593924000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:50:00.000Z',
                key: 1593924600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:00:00.000Z',
                key: 1593925200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:10:00.000Z',
                key: 1593925800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:20:00.000Z',
                key: 1593926400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:30:00.000Z',
                key: 1593927000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:40:00.000Z',
                key: 1593927600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:50:00.000Z',
                key: 1593928200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:00:00.000Z',
                key: 1593928800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:10:00.000Z',
                key: 1593929400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:20:00.000Z',
                key: 1593930000000,
                doc_count: 3,
                count: {
                  value: 3,
                },
              },
              {
                key_as_string: '2020-07-05T06:30:00.000Z',
                key: 1593930600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:40:00.000Z',
                key: 1593931200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:50:00.000Z',
                key: 1593931800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:00:00.000Z',
                key: 1593932400000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
              {
                key_as_string: '2020-07-05T07:10:00.000Z',
                key: 1593933000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:20:00.000Z',
                key: 1593933600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:30:00.000Z',
                key: 1593934200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:40:00.000Z',
                key: 1593934800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:50:00.000Z',
                key: 1593935400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:00:00.000Z',
                key: 1593936000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:10:00.000Z',
                key: 1593936600000,
                doc_count: 15,
                count: {
                  value: 15,
                },
              },
              {
                key_as_string: '2020-07-05T08:20:00.000Z',
                key: 1593937200000,
                doc_count: 29,
                count: {
                  value: 29,
                },
              },
              {
                key_as_string: '2020-07-05T08:30:00.000Z',
                key: 1593937800000,
                doc_count: 31,
                count: {
                  value: 31,
                },
              },
              {
                key_as_string: '2020-07-05T08:40:00.000Z',
                key: 1593938400000,
                doc_count: 18,
                count: {
                  value: 18,
                },
              },
            ],
          },
        },
        {
          key: 'HTTP 5xx',
          doc_count: 378,
          timeseries: {
            buckets: [
              {
                key_as_string: '2020-07-04T08:40:00.000Z',
                key: 1593852000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T08:50:00.000Z',
                key: 1593852600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:00:00.000Z',
                key: 1593853200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:10:00.000Z',
                key: 1593853800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:20:00.000Z',
                key: 1593854400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:30:00.000Z',
                key: 1593855000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:40:00.000Z',
                key: 1593855600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T09:50:00.000Z',
                key: 1593856200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:00:00.000Z',
                key: 1593856800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:10:00.000Z',
                key: 1593857400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:20:00.000Z',
                key: 1593858000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:30:00.000Z',
                key: 1593858600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:40:00.000Z',
                key: 1593859200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T10:50:00.000Z',
                key: 1593859800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:00:00.000Z',
                key: 1593860400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:10:00.000Z',
                key: 1593861000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:20:00.000Z',
                key: 1593861600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:30:00.000Z',
                key: 1593862200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:40:00.000Z',
                key: 1593862800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T11:50:00.000Z',
                key: 1593863400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:00:00.000Z',
                key: 1593864000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:10:00.000Z',
                key: 1593864600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:20:00.000Z',
                key: 1593865200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:30:00.000Z',
                key: 1593865800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:40:00.000Z',
                key: 1593866400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T12:50:00.000Z',
                key: 1593867000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:00:00.000Z',
                key: 1593867600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:10:00.000Z',
                key: 1593868200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:20:00.000Z',
                key: 1593868800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:30:00.000Z',
                key: 1593869400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:40:00.000Z',
                key: 1593870000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T13:50:00.000Z',
                key: 1593870600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:00:00.000Z',
                key: 1593871200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:10:00.000Z',
                key: 1593871800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:20:00.000Z',
                key: 1593872400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:30:00.000Z',
                key: 1593873000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:40:00.000Z',
                key: 1593873600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T14:50:00.000Z',
                key: 1593874200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:00:00.000Z',
                key: 1593874800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:10:00.000Z',
                key: 1593875400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:20:00.000Z',
                key: 1593876000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:30:00.000Z',
                key: 1593876600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:40:00.000Z',
                key: 1593877200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T15:50:00.000Z',
                key: 1593877800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:00:00.000Z',
                key: 1593878400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:10:00.000Z',
                key: 1593879000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:20:00.000Z',
                key: 1593879600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:30:00.000Z',
                key: 1593880200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:40:00.000Z',
                key: 1593880800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T16:50:00.000Z',
                key: 1593881400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:00:00.000Z',
                key: 1593882000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:10:00.000Z',
                key: 1593882600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:20:00.000Z',
                key: 1593883200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:30:00.000Z',
                key: 1593883800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:40:00.000Z',
                key: 1593884400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T17:50:00.000Z',
                key: 1593885000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:00:00.000Z',
                key: 1593885600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:10:00.000Z',
                key: 1593886200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:20:00.000Z',
                key: 1593886800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:30:00.000Z',
                key: 1593887400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:40:00.000Z',
                key: 1593888000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T18:50:00.000Z',
                key: 1593888600000,
                doc_count: 5,
                count: {
                  value: 5,
                },
              },
              {
                key_as_string: '2020-07-04T19:00:00.000Z',
                key: 1593889200000,
                doc_count: 15,
                count: {
                  value: 15,
                },
              },
              {
                key_as_string: '2020-07-04T19:10:00.000Z',
                key: 1593889800000,
                doc_count: 12,
                count: {
                  value: 12,
                },
              },
              {
                key_as_string: '2020-07-04T19:20:00.000Z',
                key: 1593890400000,
                doc_count: 16,
                count: {
                  value: 16,
                },
              },
              {
                key_as_string: '2020-07-04T19:30:00.000Z',
                key: 1593891000000,
                doc_count: 12,
                count: {
                  value: 12,
                },
              },
              {
                key_as_string: '2020-07-04T19:40:00.000Z',
                key: 1593891600000,
                doc_count: 16,
                count: {
                  value: 16,
                },
              },
              {
                key_as_string: '2020-07-04T19:50:00.000Z',
                key: 1593892200000,
                doc_count: 23,
                count: {
                  value: 23,
                },
              },
              {
                key_as_string: '2020-07-04T20:00:00.000Z',
                key: 1593892800000,
                doc_count: 10,
                count: {
                  value: 10,
                },
              },
              {
                key_as_string: '2020-07-04T20:10:00.000Z',
                key: 1593893400000,
                doc_count: 10,
                count: {
                  value: 10,
                },
              },
              {
                key_as_string: '2020-07-04T20:20:00.000Z',
                key: 1593894000000,
                doc_count: 18,
                count: {
                  value: 18,
                },
              },
              {
                key_as_string: '2020-07-04T20:30:00.000Z',
                key: 1593894600000,
                doc_count: 10,
                count: {
                  value: 10,
                },
              },
              {
                key_as_string: '2020-07-04T20:40:00.000Z',
                key: 1593895200000,
                doc_count: 17,
                count: {
                  value: 17,
                },
              },
              {
                key_as_string: '2020-07-04T20:50:00.000Z',
                key: 1593895800000,
                doc_count: 13,
                count: {
                  value: 13,
                },
              },
              {
                key_as_string: '2020-07-04T21:00:00.000Z',
                key: 1593896400000,
                doc_count: 18,
                count: {
                  value: 18,
                },
              },
              {
                key_as_string: '2020-07-04T21:10:00.000Z',
                key: 1593897000000,
                doc_count: 17,
                count: {
                  value: 17,
                },
              },
              {
                key_as_string: '2020-07-04T21:20:00.000Z',
                key: 1593897600000,
                doc_count: 17,
                count: {
                  value: 17,
                },
              },
              {
                key_as_string: '2020-07-04T21:30:00.000Z',
                key: 1593898200000,
                doc_count: 11,
                count: {
                  value: 11,
                },
              },
              {
                key_as_string: '2020-07-04T21:40:00.000Z',
                key: 1593898800000,
                doc_count: 10,
                count: {
                  value: 10,
                },
              },
              {
                key_as_string: '2020-07-04T21:50:00.000Z',
                key: 1593899400000,
                doc_count: 18,
                count: {
                  value: 18,
                },
              },
              {
                key_as_string: '2020-07-04T22:00:00.000Z',
                key: 1593900000000,
                doc_count: 16,
                count: {
                  value: 16,
                },
              },
              {
                key_as_string: '2020-07-04T22:10:00.000Z',
                key: 1593900600000,
                doc_count: 12,
                count: {
                  value: 12,
                },
              },
              {
                key_as_string: '2020-07-04T22:20:00.000Z',
                key: 1593901200000,
                doc_count: 18,
                count: {
                  value: 18,
                },
              },
              {
                key_as_string: '2020-07-04T22:30:00.000Z',
                key: 1593901800000,
                doc_count: 8,
                count: {
                  value: 8,
                },
              },
              {
                key_as_string: '2020-07-04T22:40:00.000Z',
                key: 1593902400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T22:50:00.000Z',
                key: 1593903000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:00:00.000Z',
                key: 1593903600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:10:00.000Z',
                key: 1593904200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:20:00.000Z',
                key: 1593904800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:30:00.000Z',
                key: 1593905400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-04T23:40:00.000Z',
                key: 1593906000000,
                doc_count: 1,
                count: {
                  value: 1,
                },
              },
              {
                key_as_string: '2020-07-04T23:50:00.000Z',
                key: 1593906600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:00:00.000Z',
                key: 1593907200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:10:00.000Z',
                key: 1593907800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:20:00.000Z',
                key: 1593908400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:30:00.000Z',
                key: 1593909000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:40:00.000Z',
                key: 1593909600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T00:50:00.000Z',
                key: 1593910200000,
                doc_count: 3,
                count: {
                  value: 3,
                },
              },
              {
                key_as_string: '2020-07-05T01:00:00.000Z',
                key: 1593910800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:10:00.000Z',
                key: 1593911400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:20:00.000Z',
                key: 1593912000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:30:00.000Z',
                key: 1593912600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:40:00.000Z',
                key: 1593913200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T01:50:00.000Z',
                key: 1593913800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:00:00.000Z',
                key: 1593914400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:10:00.000Z',
                key: 1593915000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:20:00.000Z',
                key: 1593915600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:30:00.000Z',
                key: 1593916200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T02:40:00.000Z',
                key: 1593916800000,
                doc_count: 3,
                count: {
                  value: 3,
                },
              },
              {
                key_as_string: '2020-07-05T02:50:00.000Z',
                key: 1593917400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:00:00.000Z',
                key: 1593918000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:10:00.000Z',
                key: 1593918600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:20:00.000Z',
                key: 1593919200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:30:00.000Z',
                key: 1593919800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:40:00.000Z',
                key: 1593920400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T03:50:00.000Z',
                key: 1593921000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:00:00.000Z',
                key: 1593921600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:10:00.000Z',
                key: 1593922200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:20:00.000Z',
                key: 1593922800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:30:00.000Z',
                key: 1593923400000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
              {
                key_as_string: '2020-07-05T04:40:00.000Z',
                key: 1593924000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T04:50:00.000Z',
                key: 1593924600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:00:00.000Z',
                key: 1593925200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:10:00.000Z',
                key: 1593925800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:20:00.000Z',
                key: 1593926400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:30:00.000Z',
                key: 1593927000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:40:00.000Z',
                key: 1593927600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T05:50:00.000Z',
                key: 1593928200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:00:00.000Z',
                key: 1593928800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:10:00.000Z',
                key: 1593929400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:20:00.000Z',
                key: 1593930000000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
              {
                key_as_string: '2020-07-05T06:30:00.000Z',
                key: 1593930600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:40:00.000Z',
                key: 1593931200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T06:50:00.000Z',
                key: 1593931800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:00:00.000Z',
                key: 1593932400000,
                doc_count: 1,
                count: {
                  value: 1,
                },
              },
              {
                key_as_string: '2020-07-05T07:10:00.000Z',
                key: 1593933000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:20:00.000Z',
                key: 1593933600000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:30:00.000Z',
                key: 1593934200000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:40:00.000Z',
                key: 1593934800000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T07:50:00.000Z',
                key: 1593935400000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:00:00.000Z',
                key: 1593936000000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-07-05T08:10:00.000Z',
                key: 1593936600000,
                doc_count: 6,
                count: {
                  value: 6,
                },
              },
              {
                key_as_string: '2020-07-05T08:20:00.000Z',
                key: 1593937200000,
                doc_count: 17,
                count: {
                  value: 17,
                },
              },
              {
                key_as_string: '2020-07-05T08:30:00.000Z',
                key: 1593937800000,
                doc_count: 16,
                count: {
                  value: 16,
                },
              },
              {
                key_as_string: '2020-07-05T08:40:00.000Z',
                key: 1593938400000,
                doc_count: 5,
                count: {
                  value: 5,
                },
              },
            ],
          },
        },
      ],
    },
    response_times: {
      buckets: [
        {
          key_as_string: '2020-07-04T08:40:00.000Z',
          key: 1593852000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T08:50:00.000Z',
          key: 1593852600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T09:00:00.000Z',
          key: 1593853200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T09:10:00.000Z',
          key: 1593853800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T09:20:00.000Z',
          key: 1593854400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T09:30:00.000Z',
          key: 1593855000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T09:40:00.000Z',
          key: 1593855600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T09:50:00.000Z',
          key: 1593856200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T10:00:00.000Z',
          key: 1593856800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T10:10:00.000Z',
          key: 1593857400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T10:20:00.000Z',
          key: 1593858000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T10:30:00.000Z',
          key: 1593858600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T10:40:00.000Z',
          key: 1593859200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T10:50:00.000Z',
          key: 1593859800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T11:00:00.000Z',
          key: 1593860400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T11:10:00.000Z',
          key: 1593861000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T11:20:00.000Z',
          key: 1593861600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T11:30:00.000Z',
          key: 1593862200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T11:40:00.000Z',
          key: 1593862800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T11:50:00.000Z',
          key: 1593863400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T12:00:00.000Z',
          key: 1593864000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T12:10:00.000Z',
          key: 1593864600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T12:20:00.000Z',
          key: 1593865200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T12:30:00.000Z',
          key: 1593865800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T12:40:00.000Z',
          key: 1593866400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T12:50:00.000Z',
          key: 1593867000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T13:00:00.000Z',
          key: 1593867600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T13:10:00.000Z',
          key: 1593868200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T13:20:00.000Z',
          key: 1593868800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T13:30:00.000Z',
          key: 1593869400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T13:40:00.000Z',
          key: 1593870000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T13:50:00.000Z',
          key: 1593870600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T14:00:00.000Z',
          key: 1593871200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T14:10:00.000Z',
          key: 1593871800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T14:20:00.000Z',
          key: 1593872400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T14:30:00.000Z',
          key: 1593873000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T14:40:00.000Z',
          key: 1593873600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T14:50:00.000Z',
          key: 1593874200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T15:00:00.000Z',
          key: 1593874800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T15:10:00.000Z',
          key: 1593875400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T15:20:00.000Z',
          key: 1593876000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T15:30:00.000Z',
          key: 1593876600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T15:40:00.000Z',
          key: 1593877200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T15:50:00.000Z',
          key: 1593877800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T16:00:00.000Z',
          key: 1593878400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T16:10:00.000Z',
          key: 1593879000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T16:20:00.000Z',
          key: 1593879600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T16:30:00.000Z',
          key: 1593880200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T16:40:00.000Z',
          key: 1593880800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T16:50:00.000Z',
          key: 1593881400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T17:00:00.000Z',
          key: 1593882000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T17:10:00.000Z',
          key: 1593882600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T17:20:00.000Z',
          key: 1593883200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T17:30:00.000Z',
          key: 1593883800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T17:40:00.000Z',
          key: 1593884400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T17:50:00.000Z',
          key: 1593885000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T18:00:00.000Z',
          key: 1593885600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T18:10:00.000Z',
          key: 1593886200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T18:20:00.000Z',
          key: 1593886800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T18:30:00.000Z',
          key: 1593887400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T18:40:00.000Z',
          key: 1593888000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T18:50:00.000Z',
          key: 1593888600000,
          doc_count: 247,
          pct: {
            values: {
              '95.0': 114680.0,
              '99.0': 827384.0,
            },
          },
          avg: {
            value: 43364.46153846154,
          },
        },
        {
          key_as_string: '2020-07-04T19:00:00.000Z',
          key: 1593889200000,
          doc_count: 542,
          pct: {
            values: {
              '95.0': 659448.0,
              '99.0': 2326520.0,
            },
          },
          avg: {
            value: 147903.58671586716,
          },
        },
        {
          key_as_string: '2020-07-04T19:10:00.000Z',
          key: 1593889800000,
          doc_count: 619,
          pct: {
            values: {
              '95.0': 122360.0,
              '99.0': 1130488.0,
            },
          },
          avg: {
            value: 57370.52342487884,
          },
        },
        {
          key_as_string: '2020-07-04T19:20:00.000Z',
          key: 1593890400000,
          doc_count: 688,
          pct: {
            values: {
              '95.0': 121336.0,
              '99.0': 1032184.0,
            },
          },
          avg: {
            value: 59687.82558139535,
          },
        },
        {
          key_as_string: '2020-07-04T19:30:00.000Z',
          key: 1593891000000,
          doc_count: 646,
          pct: {
            values: {
              '95.0': 120828.0,
              '99.0': 770044.0,
            },
          },
          avg: {
            value: 51810.68111455108,
          },
        },
        {
          key_as_string: '2020-07-04T19:40:00.000Z',
          key: 1593891600000,
          doc_count: 621,
          pct: {
            values: {
              '95.0': 139256.0,
              '99.0': 651256.0,
            },
          },
          avg: {
            value: 51736.59420289855,
          },
        },
        {
          key_as_string: '2020-07-04T19:50:00.000Z',
          key: 1593892200000,
          doc_count: 856,
          pct: {
            values: {
              '95.0': 76792.0,
              '99.0': 667640.0,
            },
          },
          avg: {
            value: 37241.293224299065,
          },
        },
        {
          key_as_string: '2020-07-04T20:00:00.000Z',
          key: 1593892800000,
          doc_count: 661,
          pct: {
            values: {
              '95.0': 129528.0,
              '99.0': 708600.0,
            },
          },
          avg: {
            value: 49444.90771558245,
          },
        },
        {
          key_as_string: '2020-07-04T20:10:00.000Z',
          key: 1593893400000,
          doc_count: 646,
          pct: {
            values: {
              '95.0': 378872.0,
              '99.0': 815096.0,
            },
          },
          avg: {
            value: 56807.80495356037,
          },
        },
        {
          key_as_string: '2020-07-04T20:20:00.000Z',
          key: 1593894000000,
          doc_count: 781,
          pct: {
            values: {
              '95.0': 97272.0,
              '99.0': 688120.0,
            },
          },
          avg: {
            value: 43238.74519846351,
          },
        },
        {
          key_as_string: '2020-07-04T20:30:00.000Z',
          key: 1593894600000,
          doc_count: 670,
          pct: {
            values: {
              '95.0': 102904.0,
              '99.0': 978936.0,
            },
          },
          avg: {
            value: 51754.80149253731,
          },
        },
        {
          key_as_string: '2020-07-04T20:40:00.000Z',
          key: 1593895200000,
          doc_count: 617,
          pct: {
            values: {
              '95.0': 100856.0,
              '99.0': 839672.0,
            },
          },
          avg: {
            value: 47166.5964343598,
          },
        },
        {
          key_as_string: '2020-07-04T20:50:00.000Z',
          key: 1593895800000,
          doc_count: 690,
          pct: {
            values: {
              '95.0': 97784.0,
              '99.0': 757752.0,
            },
          },
          avg: {
            value: 41854.688405797104,
          },
        },
        {
          key_as_string: '2020-07-04T21:00:00.000Z',
          key: 1593896400000,
          doc_count: 843,
          pct: {
            values: {
              '95.0': 72700.0,
              '99.0': 577532.0,
            },
          },
          avg: {
            value: 30464.317912218266,
          },
        },
        {
          key_as_string: '2020-07-04T21:10:00.000Z',
          key: 1593897000000,
          doc_count: 717,
          pct: {
            values: {
              '95.0': 98296.0,
              '99.0': 618488.0,
            },
          },
          avg: {
            value: 41558.531380753135,
          },
        },
        {
          key_as_string: '2020-07-04T21:20:00.000Z',
          key: 1593897600000,
          doc_count: 695,
          pct: {
            values: {
              '95.0': 112120.0,
              '99.0': 565240.0,
            },
          },
          avg: {
            value: 41159.68345323741,
          },
        },
        {
          key_as_string: '2020-07-04T21:30:00.000Z',
          key: 1593898200000,
          doc_count: 731,
          pct: {
            values: {
              '95.0': 91640.0,
              '99.0': 618488.0,
            },
          },
          avg: {
            value: 34211.03967168263,
          },
        },
        {
          key_as_string: '2020-07-04T21:40:00.000Z',
          key: 1593898800000,
          doc_count: 676,
          pct: {
            values: {
              '95.0': 83448.0,
              '99.0': 655352.0,
            },
          },
          avg: {
            value: 41322.30621301775,
          },
        },
        {
          key_as_string: '2020-07-04T21:50:00.000Z',
          key: 1593899400000,
          doc_count: 699,
          pct: {
            values: {
              '95.0': 84476.0,
              '99.0': 843772.0,
            },
          },
          avg: {
            value: 42301.523605150214,
          },
        },
        {
          key_as_string: '2020-07-04T22:00:00.000Z',
          key: 1593900000000,
          doc_count: 685,
          pct: {
            values: {
              '95.0': 117756.0,
              '99.0': 831484.0,
            },
          },
          avg: {
            value: 59615.69343065693,
          },
        },
        {
          key_as_string: '2020-07-04T22:10:00.000Z',
          key: 1593900600000,
          doc_count: 798,
          pct: {
            values: {
              '95.0': 66556.0,
              '99.0': 430076.0,
            },
          },
          avg: {
            value: 29567.520050125313,
          },
        },
        {
          key_as_string: '2020-07-04T22:20:00.000Z',
          key: 1593901200000,
          doc_count: 640,
          pct: {
            values: {
              '95.0': 130552.0,
              '99.0': 864248.0,
            },
          },
          avg: {
            value: 56104.7484375,
          },
        },
        {
          key_as_string: '2020-07-04T22:30:00.000Z',
          key: 1593901800000,
          doc_count: 241,
          pct: {
            values: {
              '95.0': 111608.0,
              '99.0': 655352.0,
            },
          },
          avg: {
            value: 40900.70954356847,
          },
        },
        {
          key_as_string: '2020-07-04T22:40:00.000Z',
          key: 1593902400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T22:50:00.000Z',
          key: 1593903000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T23:00:00.000Z',
          key: 1593903600000,
          doc_count: 50,
          pct: {
            values: {
              '95.0': 276448.0,
              '99.0': 2883552.0,
            },
          },
          avg: {
            value: 141618.04,
          },
        },
        {
          key_as_string: '2020-07-04T23:10:00.000Z',
          key: 1593904200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T23:20:00.000Z',
          key: 1593904800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T23:30:00.000Z',
          key: 1593905400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-04T23:40:00.000Z',
          key: 1593906000000,
          doc_count: 41,
          pct: {
            values: {
              '95.0': 1028088.0,
              '99.0': 6094840.0,
            },
          },
          avg: {
            value: 380742.48780487804,
          },
        },
        {
          key_as_string: '2020-07-04T23:50:00.000Z',
          key: 1593906600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T00:00:00.000Z',
          key: 1593907200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T00:10:00.000Z',
          key: 1593907800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T00:20:00.000Z',
          key: 1593908400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T00:30:00.000Z',
          key: 1593909000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T00:40:00.000Z',
          key: 1593909600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T00:50:00.000Z',
          key: 1593910200000,
          doc_count: 37,
          pct: {
            values: {
              '95.0': 352128.0,
              '99.0': 446336.0,
            },
          },
          avg: {
            value: 122524.7027027027,
          },
        },
        {
          key_as_string: '2020-07-05T01:00:00.000Z',
          key: 1593910800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T01:10:00.000Z',
          key: 1593911400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T01:20:00.000Z',
          key: 1593912000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T01:30:00.000Z',
          key: 1593912600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T01:40:00.000Z',
          key: 1593913200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T01:50:00.000Z',
          key: 1593913800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T02:00:00.000Z',
          key: 1593914400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T02:10:00.000Z',
          key: 1593915000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T02:20:00.000Z',
          key: 1593915600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T02:30:00.000Z',
          key: 1593916200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T02:40:00.000Z',
          key: 1593916800000,
          doc_count: 37,
          pct: {
            values: {
              '95.0': 348144.0,
              '99.0': 3293168.0,
            },
          },
          avg: {
            value: 160060.1081081081,
          },
        },
        {
          key_as_string: '2020-07-05T02:50:00.000Z',
          key: 1593917400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T03:00:00.000Z',
          key: 1593918000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T03:10:00.000Z',
          key: 1593918600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T03:20:00.000Z',
          key: 1593919200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T03:30:00.000Z',
          key: 1593919800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T03:40:00.000Z',
          key: 1593920400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T03:50:00.000Z',
          key: 1593921000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T04:00:00.000Z',
          key: 1593921600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T04:10:00.000Z',
          key: 1593922200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T04:20:00.000Z',
          key: 1593922800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T04:30:00.000Z',
          key: 1593923400000,
          doc_count: 64,
          pct: {
            values: {
              '95.0': 270328.0,
              '99.0': 299000.0,
            },
          },
          avg: {
            value: 70357.234375,
          },
        },
        {
          key_as_string: '2020-07-05T04:40:00.000Z',
          key: 1593924000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T04:50:00.000Z',
          key: 1593924600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T05:00:00.000Z',
          key: 1593925200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T05:10:00.000Z',
          key: 1593925800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T05:20:00.000Z',
          key: 1593926400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T05:30:00.000Z',
          key: 1593927000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T05:40:00.000Z',
          key: 1593927600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T05:50:00.000Z',
          key: 1593928200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T06:00:00.000Z',
          key: 1593928800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T06:10:00.000Z',
          key: 1593929400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T06:20:00.000Z',
          key: 1593930000000,
          doc_count: 83,
          pct: {
            values: {
              '95.0': 1687544.0,
              '99.0': 5046264.0,
            },
          },
          avg: {
            value: 269745.9036144578,
          },
        },
        {
          key_as_string: '2020-07-05T06:30:00.000Z',
          key: 1593930600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T06:40:00.000Z',
          key: 1593931200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T06:50:00.000Z',
          key: 1593931800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T07:00:00.000Z',
          key: 1593932400000,
          doc_count: 42,
          pct: {
            values: {
              '95.0': 798656.0,
              '99.0': 4292544.0,
            },
          },
          avg: {
            value: 313349.95238095237,
          },
        },
        {
          key_as_string: '2020-07-05T07:10:00.000Z',
          key: 1593933000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T07:20:00.000Z',
          key: 1593933600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T07:30:00.000Z',
          key: 1593934200000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T07:40:00.000Z',
          key: 1593934800000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T07:50:00.000Z',
          key: 1593935400000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T08:00:00.000Z',
          key: 1593936000000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-07-05T08:10:00.000Z',
          key: 1593936600000,
          doc_count: 215,
          pct: {
            values: {
              '95.0': 3653624.0,
              '99.0': 5046264.0,
            },
          },
          avg: {
            value: 397251.288372093,
          },
        },
        {
          key_as_string: '2020-07-05T08:20:00.000Z',
          key: 1593937200000,
          doc_count: 494,
          pct: {
            values: {
              '95.0': 3276768.0,
              '99.0': 4292576.0,
            },
          },
          avg: {
            value: 361953.5931174089,
          },
        },
        {
          key_as_string: '2020-07-05T08:30:00.000Z',
          key: 1593937800000,
          doc_count: 518,
          pct: {
            values: {
              '95.0': 522208.0,
              '99.0': 4128736.0,
            },
          },
          avg: {
            value: 259173.0694980695,
          },
        },
        {
          key_as_string: '2020-07-05T08:40:00.000Z',
          key: 1593938400000,
          doc_count: 449,
          pct: {
            values: {
              '95.0': 372728.0,
              '99.0': 843768.0,
            },
          },
          avg: {
            value: 79648.20935412026,
          },
        },
      ],
    },
    overall_avg_duration: {
      value: 73065.05176360115,
    },
  },
} as unknown) as ESResponse;
