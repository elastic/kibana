/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const AGGR_FIELD = 'new_terms_values';
const DELIMITER = '_';

export const parseDateString = ({
  date,
  forceNow,
  name,
}: {
  date: string;
  forceNow: Date;
  name?: string;
}): moment.Moment => {
  const parsedDate = dateMath.parse(date, {
    forceNow,
  });
  if (parsedDate == null || !parsedDate.isValid()) {
    throw Error(`Failed to parse '${name ?? 'date string'}'`);
  }
  return parsedDate;
};

export const validateHistoryWindowStart = ({
  historyWindowStart,
  from,
}: {
  historyWindowStart: string;
  from: string;
}) => {
  const forceNow = moment().toDate();
  const parsedHistoryWindowStart = parseDateString({
    date: historyWindowStart,
    forceNow,
    name: 'historyWindowStart',
  });
  const parsedFrom = parseDateString({ date: from, forceNow, name: 'from' });
  if (parsedHistoryWindowStart.isSameOrAfter(parsedFrom)) {
    throw Error(
      `History window size is smaller than rule interval + additional lookback, 'historyWindowStart' must be earlier than 'from'`
    );
  }
};

export const retrieveValuesFromBuckets = (
  newTermsFields: string[],
  buckets: Array<{ key: Record<string, string | number | null> }>
): Array<string | number> => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length === 1) {
    return buckets
      .map((bucket) => Object.values(bucket.key)[0])
      .filter((value): value is string | number => value != null);
  }

  return buckets.map((bucket) =>
    Object.values(bucket.key)
      .filter((value): value is string | number => value != null)
      .map((value) =>
        Buffer.from(typeof value !== 'string' ? value.toString() : value).toString('base64')
      )
      .join(DELIMITER)
  );
};

export const getRuntimeMappings = (
  newTermsFields: string[]
): undefined | { [AGGR_FIELD]: estypes.MappingRuntimeField } => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length === 1) {
    return undefined;
  }

  const fields = newTermsFields.map((field) => `'${field}'`).join(', ');
  return {
    [AGGR_FIELD]: {
      type: 'keyword',
      script: `
      String[] fields = new String[] {${fields}};
      String acc = doc[fields[0]].value.encodeBase64();

      for (int i = 1; i < fields.length; i++) {
        acc = acc + '${DELIMITER}' + doc[fields[i]].value.encodeBase64();
      }
      
      String[] arr = new String[1];
      arr[0] = acc;
      
      emit(arr[0])
    `,
    },
  };
};

export const getAggregationField = (newTermsFields: string[]): string => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length === 1) {
    return newTermsFields[0];
  }

  return AGGR_FIELD;
};

export const decodeMatchedBucketKey = (
  newTermsFields: string[],
  bucketKey: string | number
): Array<string | number> => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length === 1) {
    return [bucketKey];
  }

  // if newTermsFields has length greater than 1, bucketKey can't be umber, so casting is safe here
  return (bucketKey as string)
    .split(DELIMITER)
    .map((encodedValue) => Buffer.from(encodedValue, 'base64').toString());
};
