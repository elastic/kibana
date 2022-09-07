/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';
import type {
  MatrixHistogramParseData,
  MatrixHistogramBucket,
  MatrixHistogramData,
} from '../../../../../common/search_strategy/security_solution/matrix_histogram';

export const getGenericData = <T>(
  data: MatrixHistogramParseData<T>,
  keyBucket: string
): MatrixHistogramData[] => {
  let result: MatrixHistogramData[] = [];
  data.forEach((bucketData: unknown) => {
    // if key_as_string is present use it, else default to the existing key
    const group = get('key_as_string', bucketData) ?? get('key', bucketData);
    const histData = getOr([], keyBucket, bucketData).map(
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ({ key, doc_count }: MatrixHistogramBucket) => ({
        x: key,
        y: doc_count,
        g: group,
      })
    );
    result = [...result, ...histData];
  });

  return result;
};
