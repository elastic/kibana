/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { ml } from '../../../../services/ml_api_service';

interface CategoryResults {
  success: boolean;
  results: string[];
}

export function getCategoryFields(
  indexPatternName: string,
  fieldName: string,
  size: number,
  query: any
): Promise<CategoryResults> {
  return new Promise((resolve, reject) => {
    ml.esSearch({
      index: indexPatternName,
      size: 0,
      body: {
        query,
        aggs: {
          catFields: {
            terms: {
              field: fieldName,
              size,
            },
          },
        },
      },
    })
      .then((resp: any) => {
        const catFields = get(resp, ['aggregations', 'catFields', 'buckets'], []);

        resolve({
          success: true,
          results: catFields.map((f: any) => f.key),
        });
      })
      .catch((resp: any) => {
        reject(resp);
      });
  });
}
