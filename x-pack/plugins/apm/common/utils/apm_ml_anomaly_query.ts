/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function apmMlAnomalyQuery(detectorIndex: 0 | 1 | 2) {
  return [
    {
      bool: {
        filter: [
          {
            terms: {
              result_type: ['model_plot', 'record'],
            },
          },
          {
            term: { detector_index: detectorIndex },
          },
        ],
      },
    },
  ];
}
