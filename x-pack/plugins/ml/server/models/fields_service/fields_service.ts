/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';

/**
 * Service for carrying out queries to obtain data
 * specific to fields in Elasticsearch indices.
 */
export function fieldsServiceProvider(callAsCurrentUser: APICaller) {
  /**
   * Gets aggregatable fields.
   */
  async function getAggregatableFields(
    index: string | string[],
    fieldNames: string[]
  ): Promise<string[]> {
    const fieldCapsResp = await callAsCurrentUser('fieldCaps', {
      index,
      fields: fieldNames,
    });
    const aggregatableFields: string[] = [];
    fieldNames.forEach(fieldName => {
      const fieldInfo = fieldCapsResp.fields[fieldName];
      const typeKeys = fieldInfo !== undefined ? Object.keys(fieldInfo) : [];
      if (typeKeys.length > 0) {
        const fieldType = typeKeys[0];
        const isFieldAggregatable = fieldInfo[fieldType].aggregatable;
        if (isFieldAggregatable === true) {
          aggregatableFields.push(fieldName);
        }
      }
    });
    return aggregatableFields;
  }

  // Obtains the cardinality of one or more fields.
  // Returns an Object whose keys are the names of the fields,
  // with values equal to the cardinality of the field.
  // Any of the supplied fieldNames which are not aggregatable will
  // be omitted from the returned Object.
  async function getCardinalityOfFields(
    index: string[] | string,
    fieldNames: string[],
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number
  ): Promise<{ [key: string]: number }> {
    const aggregatableFields = await getAggregatableFields(index, fieldNames);

    if (aggregatableFields.length === 0) {
      return {};
    }

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the time range and the datafeed config query.
    const mustCriteria = [
      {
        range: {
          [timeFieldName]: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      },
    ];

    if (query) {
      mustCriteria.push(query);
    }

    const aggs = aggregatableFields.reduce((obj, field) => {
      obj[field] = { cardinality: { field } };
      return obj;
    }, {} as { [field: string]: { cardinality: { field: string } } });

    const body = {
      query: {
        bool: {
          must: mustCriteria,
        },
      },
      size: 0,
      _source: {
        excludes: [],
      },
      aggs,
    };

    const aggregations = (
      await callAsCurrentUser('search', {
        index,
        body,
      })
    )?.aggregations;

    if (!aggregations) {
      return {};
    }

    return aggregatableFields.reduce((obj, field) => {
      obj[field] = (aggregations[field] || { value: 0 }).value;
      return obj;
    }, {} as { [field: string]: number });
  }

  function getTimeFieldRange(
    index: string[] | string,
    timeFieldName: string,
    query: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const obj = { success: true, start: { epoch: 0, string: '' }, end: { epoch: 0, string: '' } };

      callAsCurrentUser('search', {
        index,
        size: 0,
        body: {
          query,
          aggs: {
            earliest: {
              min: {
                field: timeFieldName,
              },
            },
            latest: {
              max: {
                field: timeFieldName,
              },
            },
          },
        },
      })
        .then(resp => {
          if (resp.aggregations && resp.aggregations.earliest && resp.aggregations.latest) {
            obj.start.epoch = resp.aggregations.earliest.value;
            obj.start.string = resp.aggregations.earliest.value_as_string;

            obj.end.epoch = resp.aggregations.latest.value;
            obj.end.string = resp.aggregations.latest.value_as_string;
          }
          resolve(obj);
        })
        .catch(resp => {
          reject(resp);
        });
    });
  }

  async function getMaxBucketCardinality(
    index: string[] | string,
    fieldNames: string[],
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    interval: string | undefined
  ): Promise<{ [key: string]: number }> {
    const aggregatableFields = await getAggregatableFields(index, fieldNames);

    if (aggregatableFields.length === 0) {
      return {};
    }

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the time range and the datafeed config query.
    const mustCriteria = [
      {
        range: {
          [timeFieldName]: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      },
    ];

    if (query) {
      mustCriteria.push(query);
    }

    const aggs = aggregatableFields.reduce((obj, field) => {
      obj[field] = { cardinality: { field } };
      return obj;
    }, {} as { [field: string]: { cardinality: { field: string } } });

    const body = {
      query: {
        bool: {
          must: mustCriteria,
        },
      },
      size: 0,
      aggs: {
        bucket_span_buckets: {
          date_histogram: {
            field: timeFieldName,
            fixed_interval: interval,
          },
          aggs,
        },
        ...Object.keys(aggs).reduce((acc, aggKey) => {
          acc[`max_bucket_${aggKey}`] = {
            max_bucket: {
              buckets_path: `bucket_span_buckets>${aggKey}`,
            },
          };
          return acc;
        }, {} as { [key: string]: { max_bucket: { buckets_path: string } } }),
      },
    };

    const aggregations = (
      await callAsCurrentUser('search', {
        index,
        body,
      })
    )?.aggregations;

    if (!aggregations) {
      return {};
    }

    return aggregatableFields.reduce((obj, field) => {
      obj[field] = (aggregations[`max_bucket_${field}`] || { value: 0 }).value;
      return obj;
    }, {} as { [field: string]: number });
  }

  return {
    getCardinalityOfFields,
    getTimeFieldRange,
    getMaxBucketCardinality,
  };
}
