/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';
import {
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
    const group = get('key', bucketData);
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

export const getEntitiesParser = <T>(
  data: MatrixHistogramParseData<T>,
  keyBucket: string // TODO: Remove this keyBucket if it is not being used.
): MatrixHistogramData[] => {
  let result: MatrixHistogramData[] = [];
  data.forEach((bucketData: unknown) => {
    const successValue = get('success.value', bucketData);
    const failureValue = get('failure.value', bucketData);
    const key = get('key', bucketData);
    const histDataSuccess = { x: key, y: successValue, g: 'success' };
    const histDataFailure = { x: key, y: failureValue, g: 'failure' };
    result = [...result, histDataFailure, histDataSuccess];
  });
  return result;
};
