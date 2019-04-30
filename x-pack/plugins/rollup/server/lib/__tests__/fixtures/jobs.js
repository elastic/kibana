/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const jobs = [
  {
    "job_id" : "foo1",
    "rollup_index" : "foo_rollup",
    "index_pattern" : "foo-*",
    "fields" : {
      "node" : [
        {
          "agg" : "terms"
        }
      ],
      "temperature" : [
        {
          "agg" : "min"
        },
        {
          "agg" : "max"
        },
        {
          "agg" : "sum"
        }
      ],
      "timestamp" : [
        {
          "agg" : "date_histogram",
          "time_zone" : "UTC",
          "interval" : "1h",
          "delay": "7d"
        }
      ],
      "voltage" : [
        {
          "agg" : "histogram",
          "interval": 5
        },
        {
          "agg" : "sum"
        }
      ]
    }
  },
  {
    "job_id" : "foo2",
    "rollup_index" : "foo_rollup",
    "index_pattern" : "foo-*",
    "fields" : {
      "host" : [
        {
          "agg" : "terms"
        }
      ],
      "timestamp" : [
        {
          "agg" : "date_histogram",
          "time_zone" : "UTC",
          "interval" : "1h",
          "delay": "7d"
        }
      ],
      "voltage" : [
        {
          "agg" : "histogram",
          "interval": 20
        }
      ]
    }
  },
  {
    "job_id" : "foo3",
    "rollup_index" : "foo_rollup",
    "index_pattern" : "foo-*",
    "fields" : {
      "timestamp" : [
        {
          "agg" : "date_histogram",
          "time_zone" : "PST",
          "interval" : "1h",
          "delay": "7d"
        }
      ],
      "voltage" : [
        {
          "agg" : "histogram",
          "interval": 5
        },
        {
          "agg" : "sum"
        }
      ]
    }
  }
];
