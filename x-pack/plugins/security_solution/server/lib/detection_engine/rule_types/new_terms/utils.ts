/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const AGG_FIELD_NAME = 'new_terms_values';
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

/**
 * creates runtime field
 * @param newTermsFields
 * @returns
 */
export const getNewTermsRuntimeMappings = (
  newTermsFields: string[]
): undefined | { [AGG_FIELD_NAME]: estypes.MappingRuntimeField } => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length === 1) {
    return undefined;
  }

  return {
    [AGG_FIELD_NAME]: {
      type: 'keyword',
      script: {
        params: { fields: newTermsFields },
        source: `
          void traverseDocFields(def doc, def fields, def index, def line) {
            if (index === fields.length) {
              emit(line);
            } else {
              for (field in doc[fields[index]]) {
                def delimiter = index === 0 ? '' : '${DELIMITER}';
                def nextLine = line + delimiter + String.valueOf(field).encodeBase64();

                traverseDocFields(doc, fields, index + 1, nextLine);
              }
            }
          }

          traverseDocFields(doc, params['fields'], 0, '');
        `,
      },
    },
  };
};

export const getAggregationField = (newTermsFields: string[]): string => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length === 1) {
    return newTermsFields[0];
  }

  return AGG_FIELD_NAME;
};

const decodeBucketKey = (bucketKey: string): string[] => {
  // if newTermsFields has length greater than 1, bucketKey can't be number, so casting is safe here
  return bucketKey
    .split(DELIMITER)
    .map((encodedValue) => Buffer.from(encodedValue, 'base64').toString());
};

/**
 * returns new term fields and values in following format
 * @example
 * [ 'field1: new_value1', 'field2: new_value2']
 */
export const prepareNewTerms = (newTermsFields: string[], bucketKey: string | number) => {
  // if newTermsFields has length greater than 1, bucketKey can't be number, so casting is safe here
  const values = newTermsFields.length === 1 ? [bucketKey] : decodeBucketKey(bucketKey as string);

  return values;
  //  return newTermsFields.map((field, i) => [field, values[i]].join(': '));
};
