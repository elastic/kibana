/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

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

/**
 * Takes a list of buckets and creates value from them to be used in 'include' clause of terms aggregation.
 * For a single new terms field, value equals to bucket name
 * Otherwise throws error
 * @returns
 */
export const transformBucketsToValues = (
  newTermsFields: string[],
  buckets: estypes.AggregationsCompositeBucket[]
): Array<string | number> => {
  // if new terms include only one field we don't use runtime mappings and don't stitch fields buckets together
  if (newTermsFields.length === 1) {
    return buckets
      .map((bucket) => Object.values(bucket.key)[0])
      .filter((value): value is string | number => value != null);
  }
  throw Error('Can be used for single new terms field only');
};
