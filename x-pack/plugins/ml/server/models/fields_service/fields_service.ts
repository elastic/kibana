/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { duration } from 'moment';
import { parseInterval } from '../../../common/util/parse_interval';
import { initCardinalityFieldsCache } from './fields_aggs_cache';

/**
 * Service for carrying out queries to obtain data
 * specific to fields in Elasticsearch indices.
 */
export function fieldsServiceProvider({ callAsCurrentUser }: ILegacyScopedClusterClient) {
  const fieldsAggsCache = initCardinalityFieldsCache();

  /**
   * Caps the time range to the last 90 days if necessary
   */
  function getSafeTimeRange(earliestMs: number, latestMs: number): { start: number; end: number } {
    const capOffsetMs = duration(3, 'months').asMilliseconds();
    const capRangeStart = latestMs - capOffsetMs;

    return {
      start: Math.max(earliestMs, capRangeStart),
      end: latestMs,
    };
  }

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
    fieldNames.forEach((fieldName) => {
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

    const { start, end } = getSafeTimeRange(earliestMs, latestMs);

    const cachedValues =
      fieldsAggsCache.getValues(
        index,
        timeFieldName,
        start,
        end,
        'overallCardinality',
        fieldNames
      ) ?? {};

    // No need to perform aggregation over the cached fields
    const fieldsToAgg = aggregatableFields.filter((field) => !cachedValues.hasOwnProperty(field));

    if (fieldsToAgg.length === 0) {
      return cachedValues;
    }

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the time range and the datafeed config query.
    const mustCriteria = [
      {
        range: {
          [timeFieldName]: {
            gte: start,
            lte: end,
            format: 'epoch_millis',
          },
        },
      },
    ];

    if (query) {
      mustCriteria.push(query);
    }

    const aggs = fieldsToAgg.reduce((obj, field) => {
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

    const aggResult = fieldsToAgg.reduce((obj, field) => {
      obj[field] = (aggregations[field] || { value: 0 }).value;
      return obj;
    }, {} as { [field: string]: number });

    fieldsAggsCache.updateValues(index, timeFieldName, start, end, {
      overallCardinality: aggResult,
    });

    return {
      ...cachedValues,
      ...aggResult,
    };
  }

  /**
   * Gets time boundaries of the index data based on the provided time field.
   */
  async function getTimeFieldRange(
    index: string[] | string,
    timeFieldName: string,
    query: any
  ): Promise<{
    success: boolean;
    start: { epoch: number; string: string };
    end: { epoch: number; string: string };
  }> {
    const obj = { success: true, start: { epoch: 0, string: '' }, end: { epoch: 0, string: '' } };

    const resp = await callAsCurrentUser('search', {
      index,
      size: 0,
      body: {
        ...(query ? { query } : {}),
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
    });

    if (resp.aggregations && resp.aggregations.earliest && resp.aggregations.latest) {
      obj.start.epoch = resp.aggregations.earliest.value;
      obj.start.string = resp.aggregations.earliest.value_as_string;

      obj.end.epoch = resp.aggregations.latest.value;
      obj.end.string = resp.aggregations.latest.value_as_string;
    }
    return obj;
  }

  /**
   * Caps provided time boundaries based on the interval
   */
  function getSafeTimeRangeForInterval(
    interval: string,
    ...timeRange: number[]
  ): { start: number; end: number };
  function getSafeTimeRangeForInterval(
    interval: string,
    earliestMs: number,
    latestMs: number
  ): { start: number; end: number } {
    const maxNumberOfBuckets = 1000;
    const end = latestMs;

    const intervalDuration = parseInterval(interval);

    if (intervalDuration === null) {
      throw Boom.badRequest('Interval is invalid');
    }

    const start = Math.max(
      earliestMs,
      latestMs - maxNumberOfBuckets * intervalDuration.asMilliseconds()
    );

    return { start, end };
  }

  /**
   * Retrieves max cardinalities for provided fields from date interval buckets
   * using max bucket pipeline aggregation.
   *
   * @param index
   * @param fieldNames - fields to perform cardinality aggregation on
   * @param query
   * @param timeFieldName
   * @param earliestMs
   * @param latestMs
   * @param interval - a fixed interval for the date histogram aggregation
   */
  async function getMaxBucketCardinalities(
    index: string[] | string,
    fieldNames: string[],
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    interval: string | undefined
  ): Promise<{ [key: string]: number }> {
    if (!interval) {
      throw Boom.badRequest('Interval is required to retrieve max bucket cardinalities.');
    }

    const aggregatableFields = await getAggregatableFields(index, fieldNames);

    if (aggregatableFields.length === 0) {
      return {};
    }

    const { start, end } = getSafeTimeRangeForInterval(
      interval,
      ...Object.values(getSafeTimeRange(earliestMs, latestMs))
    );

    const cachedValues =
      fieldsAggsCache.getValues(
        index,
        timeFieldName,
        start,
        end,
        'maxBucketCardinality',
        fieldNames
      ) ?? {};

    // No need to perform aggregation over the cached fields
    const fieldsToAgg = aggregatableFields.filter((field) => !cachedValues.hasOwnProperty(field));

    if (fieldsToAgg.length === 0) {
      return cachedValues;
    }

    const mustCriteria = [
      {
        range: {
          [timeFieldName]: {
            gte: start,
            lte: end,
            format: 'epoch_millis',
          },
        },
      },
    ];

    if (query) {
      mustCriteria.push(query);
    }

    const dateHistogramAggKey = 'bucket_span_buckets';
    /**
     * Replace any non-word characters
     */
    const getSafeAggName = (field: string) => field.replace(/\W/g, '');
    const getMaxBucketAggKey = (field: string) => `max_bucket_${field}`;

    const fieldsCardinalityAggs = fieldsToAgg.reduce((obj, field) => {
      obj[getSafeAggName(field)] = { cardinality: { field } };
      return obj;
    }, {} as { [field: string]: { cardinality: { field: string } } });

    const maxBucketCardinalitiesAggs = Object.keys(fieldsCardinalityAggs).reduce((acc, field) => {
      acc[getMaxBucketAggKey(field)] = {
        max_bucket: {
          buckets_path: `${dateHistogramAggKey}>${field}`,
        },
      };
      return acc;
    }, {} as { [key: string]: { max_bucket: { buckets_path: string } } });

    const body = {
      query: {
        bool: {
          filter: mustCriteria,
        },
      },
      size: 0,
      aggs: {
        [dateHistogramAggKey]: {
          date_histogram: {
            field: timeFieldName,
            fixed_interval: interval,
          },
          aggs: fieldsCardinalityAggs,
        },
        ...maxBucketCardinalitiesAggs,
      },
    };

    const aggregations = (
      await callAsCurrentUser('search', {
        index,
        body,
      })
    )?.aggregations;

    if (!aggregations) {
      return cachedValues;
    }

    const aggResult = fieldsToAgg.reduce((obj, field) => {
      obj[field] = (aggregations[getMaxBucketAggKey(field)] || { value: 0 }).value ?? 0;
      return obj;
    }, {} as { [field: string]: number });

    fieldsAggsCache.updateValues(index, timeFieldName, start, end, {
      maxBucketCardinality: aggResult,
    });

    return {
      ...cachedValues,
      ...aggResult,
    };
  }

  return {
    getCardinalityOfFields,
    getTimeFieldRange,
    getMaxBucketCardinalities,
  };
}
