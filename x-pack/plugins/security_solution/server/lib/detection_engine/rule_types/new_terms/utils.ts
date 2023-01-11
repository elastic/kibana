/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const AGG_FIELD_NAME = 'new_terms_values';
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

/**
 * Takes a list of buckets and creates value from them to be used in 'include' clause of terms aggregation.
 * For a single new terms field, value equals to bucket name
 * For multiple new terms fields and buckets, value equals to concatenated base64 encoded bucket names
 * @returns for buckets('host-0', 'test'), resulted value equals to: 'aG9zdC0w_dGVzdA=='
 */
export const transformBucketsToValues = (
  newTermsFields: string[],
  buckets: estypes.AggregationsCompositeBucket[]
): Array<string | number> => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length === 1) {
    return buckets
      .map((bucket) => Object.values(bucket.key)[0])
      .filter((value): value is string | number => value != null);
  }

  return buckets
    .map((bucket) => Object.values(bucket.key))
    .filter((values) => !values.some((value) => value == null))
    .map((values) =>
      values
        .map((value) =>
          Buffer.from(typeof value !== 'string' ? value.toString() : value).toString('base64')
        )
        .join(DELIMITER)
    );
};

/**
 * transforms arrays of new terms fields and its values in object
 * [new_terms_field]: { [value1]: true, [value1]: true  }
 * It's needed to have constant time complexity of accessing whether value is present in new terms
 * It will be passed to Painless script used in runtime field
 */
export const createFieldValuesMap = (
  newTermsFields: string[],
  buckets: estypes.AggregationsCompositeBucket[]
) => {
  if (newTermsFields.length === 1) {
    return undefined;
  }

  const valuesMap = newTermsFields.reduce<Record<string, Record<string, boolean>>>(
    (acc, field) => ({ ...acc, [field]: {} }),
    {}
  );

  buckets
    .map((bucket) => bucket.key)
    .forEach((bucket) => {
      Object.entries(bucket).forEach(([key, value]) => {
        if (value == null) {
          return;
        }
        const strValue = typeof value !== 'string' ? value.toString() : value;
        valuesMap[key][strValue] = true;
      });
    });

  return valuesMap;
};

export const getNewTermsRuntimeMappings = (
  newTermsFields: string[],
  buckets: estypes.AggregationsCompositeBucket[]
): undefined | { [AGG_FIELD_NAME]: estypes.MappingRuntimeField } => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length <= 1) {
    return undefined;
  }

  const values = createFieldValuesMap(newTermsFields, buckets);
  return {
    [AGG_FIELD_NAME]: {
      type: 'keyword',
      script: {
        params: { fields: newTermsFields, values },
        source: `
          def stack = new Stack();
          // ES has limit in 100 values for runtime field, after this query will fail
          int emitLimit = 100;
          stack.add([0, '']);
          
          while (stack.length > 0) {
              if (emitLimit == 0) {
                break;
              }
              def tuple = stack.pop();
              def index = tuple[0];
              def line = tuple[1];    
              if (index === params['fields'].length) {
                emit(line);
                emitLimit = emitLimit - 1;
              } else {
                def fieldName = params['fields'][index];
                for (field in doc[fieldName]) {
                    def fieldStr = String.valueOf(field);
                    if (!params['values'][fieldName].containsKey(fieldStr)) {
                      continue;
                    }
                    def delimiter = index === 0 ? '' : '${DELIMITER}';
                    def nextLine = line + delimiter + fieldStr.encodeBase64();
          
                    stack.add([index + 1, nextLine])
                }
              }
          }
        `,
      },
    },
  };
};

/**
 * For a single new terms field, aggregation field equals to new terms field
 * For multiple new terms fields, aggregation field equals to defined AGG_FIELD_NAME, which is runtime field
 */
export const getAggregationField = (newTermsFields: string[]): string => {
  // if new terms include only one field we don't use runtime mappings and don't stich fields buckets together
  if (newTermsFields.length === 1) {
    return newTermsFields[0];
  }

  return AGG_FIELD_NAME;
};

const decodeBucketKey = (bucketKey: string): string[] => {
  return bucketKey
    .split(DELIMITER)
    .map((encodedValue) => Buffer.from(encodedValue, 'base64').toString());
};

/**
 * decodes matched values(bucket keys) from terms aggregation and returns fields as array
 * @returns 'aG9zdC0w_dGVzdA==' bucket key will result in ['host-0', 'test']
 */
export const decodeMatchedValues = (newTermsFields: string[], bucketKey: string | number) => {
  // if newTermsFields has length greater than 1, bucketKey can't be number, so casting is safe here
  const values = newTermsFields.length === 1 ? [bucketKey] : decodeBucketKey(bucketKey as string);

  return values;
};
