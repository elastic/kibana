/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';
import { MatrixHistogramParseData, DnsHistogramSubBucket, HistogramBucket } from './types';
import { MatrixOverTimeHistogramData } from '../../graphql/types';

export const getDnsParsedData = <T>(
  data: MatrixHistogramParseData<T>,
  keyBucket: string
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach((bucketData: unknown) => {
    const time = get('key', bucketData);
    const histData = getOr([], keyBucket, bucketData).map(
      ({ key, doc_count }: DnsHistogramSubBucket) => ({
        x: time,
        y: doc_count,
        g: key,
      })
    );
    result = [...result, ...histData];
  });
  return result;
};

export const getGenericData = <T>(
  data: MatrixHistogramParseData<T>,
  keyBucket: string
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach((bucketData: unknown) => {
    const group = get('key', bucketData);
    const histData = getOr([], keyBucket, bucketData).map(
      ({ key, doc_count }: HistogramBucket) => ({
        x: key,
        y: doc_count,
        g: group,
      })
    );
    result = [...result, ...histData];
  });

  return result;
};
