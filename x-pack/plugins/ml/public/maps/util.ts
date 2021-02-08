/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { ml } from '../../../../services/ml_api_service';

import { FeatureCollection, Feature } from 'geojson';

const DUMMY_JOB_LIST = [
  {
    jobId: 'Africa incidents',
    results: [
      {
        typical: [10, 12],
        actual: [14, 16],
        record_score: 0.7,
      },
      {
        typical: [9, 11],
        actual: [14, 16],
        record_score: 0.6,
      },
    ],
  },
  {
    jobId: 'USA incidents',
    results: [
      {
        typical: [-80, 40],
        actual: [-81, 42],
        record_score: 0.7,
      },
      {
        typical: [-79, 35],
        actual: [-78, 34],
        record_score: 0.3,
      },
    ],
  },
];

export async function getAnomalyJobList(): Promise<Array<{ jobId: string }>> {
  // console.log(ml);
  return DUMMY_JOB_LIST;
}

export async function getResultsForJobId(
  jobId: string,
  locationType: 'typical' | 'actual'
): Promise<FeatureCollection> {
  const job = DUMMY_JOB_LIST.find((j) => {
    return j.jobId === jobId;
  });

  const features: Feature[] = job!.results.map((result) => {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: locationType === 'typical' ? result.typical : result.actual,
      },
      properties: {
        record_score: result.record_score,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
