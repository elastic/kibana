/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ml } from '../../../../services/ml_api_service';

const DUMMY_JOB_LIST = [
  {
    jobId: 'foo',
    results: [
      {
        typical: [10, 12],
        actual: [14, 16],
        record_score: 5,
      },
      {
        typical: [9, 11],
        actual: [14, 16],
        record_score: 5,
      },
    ],
  },
  {
    jobId: 'bar',
    results: [
      {
        typical: [10, 12],
        actual: [14, 16],
        record_score: 5,
      },
      {
        typical: [10, 12],
        actual: [14, 16],
        record_score: 5,
      },
    ],
  },
];

export function getAnomalyJobList() {
  // console.log(ml);
  return DUMMY_JOB_LIST;
}

export function getResultsForJobId() {
  // console.log(ml);
}
