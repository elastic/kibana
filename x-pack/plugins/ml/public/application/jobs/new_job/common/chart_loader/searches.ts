/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { ml } from '../../../../services/ml_api_service';
import type { IndicesOptions } from '../../../../../../common/types/anomaly_detection_jobs';

interface CategoryResults {
  success: boolean;
  results: string[];
}

export function getCategoryFields(
  indexPatternName: string,
  fieldName: string,
  size: number,
  query: any,
  runtimeMappings?: RuntimeMappings,
  indicesOptions?: IndicesOptions
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
        ...(runtimeMappings !== undefined ? { runtime_mappings: runtimeMappings } : {}),
      },
      ...(indicesOptions ?? {}),
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
