/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { get } from 'lodash';
import { IScopedClusterClient } from 'kibana/server';
import { AggCardinality, Aggs, FieldData } from '../../types';
import {
  buildBaseFilterCriteria,
  buildSamplerAggregation,
  getSafeAggregationName,
  getSamplerAggregationsResponsePath,
} from '../../../common/utils/query_utils';
import { getDatafeedAggregations } from '../../../common/utils/datafeed_utils';
import { isPopulatedObject } from '../../../common/utils/object_utils';

export const checkAggregatableFieldsExist = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: any,
  aggregatableFields: string[],
  samplerShardSize: number,
  timeFieldName: string | undefined,
  earliestMs?: number,
  latestMs?: number,
  datafeedConfig?: estypes.MlDatafeed,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const { asCurrentUser } = client;

  const index = indexPatternTitle;
  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);
  const datafeedAggregations = getDatafeedAggregations(datafeedConfig);

  // Value count aggregation faster way of checking if field exists than using
  // filter aggregation with exists query.
  const aggs: Aggs = datafeedAggregations !== undefined ? { ...datafeedAggregations } : {};

  // Combine runtime fields from the index pattern as well as the datafeed
  const combinedRuntimeMappings: estypes.MappingRuntimeFields = {
    ...(isPopulatedObject(runtimeMappings) ? runtimeMappings : {}),
    ...(isPopulatedObject(datafeedConfig) && isPopulatedObject(datafeedConfig.runtime_mappings)
      ? datafeedConfig.runtime_mappings
      : {}),
  };

  aggregatableFields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field, i);
    aggs[`${safeFieldName}_count`] = {
      filter: { exists: { field } },
    };

    let cardinalityField: AggCardinality;
    if (datafeedConfig?.script_fields?.hasOwnProperty(field)) {
      cardinalityField = aggs[`${safeFieldName}_cardinality`] = {
        cardinality: { script: datafeedConfig?.script_fields[field].script },
      };
    } else {
      cardinalityField = {
        cardinality: { field },
      };
    }
    aggs[`${safeFieldName}_cardinality`] = cardinalityField;
  });

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(isPopulatedObject(aggs) ? { aggs: buildSamplerAggregation(aggs, samplerShardSize) } : {}),
    ...(isPopulatedObject(combinedRuntimeMappings)
      ? { runtime_mappings: combinedRuntimeMappings }
      : {}),
  };

  const { body } = await asCurrentUser.search({
    index,
    track_total_hits: true,
    size,
    body: searchBody,
  });

  const aggregations = body.aggregations;
  // @ts-expect-error incorrect search response type
  const totalCount = body.hits.total.value;
  const stats = {
    totalCount,
    aggregatableExistsFields: [] as FieldData[],
    aggregatableNotExistsFields: [] as FieldData[],
  };

  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const sampleCount =
    samplerShardSize > 0 ? get(aggregations, ['sample', 'doc_count'], 0) : totalCount;
  aggregatableFields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field, i);
    const count = get(aggregations, [...aggsPath, `${safeFieldName}_count`, 'doc_count'], 0);
    if (count > 0) {
      const cardinality = get(
        aggregations,
        [...aggsPath, `${safeFieldName}_cardinality`, 'value'],
        0
      );
      stats.aggregatableExistsFields.push({
        fieldName: field,
        existsInDocs: true,
        stats: {
          sampleCount,
          count,
          cardinality,
        },
      });
    } else {
      if (
        datafeedConfig?.script_fields?.hasOwnProperty(field) ||
        datafeedConfig?.runtime_mappings?.hasOwnProperty(field)
      ) {
        const cardinality = get(
          aggregations,
          [...aggsPath, `${safeFieldName}_cardinality`, 'value'],
          0
        );
        stats.aggregatableExistsFields.push({
          fieldName: field,
          existsInDocs: true,
          stats: {
            sampleCount,
            count,
            cardinality,
          },
        });
      } else {
        stats.aggregatableNotExistsFields.push({
          fieldName: field,
          existsInDocs: false,
        });
      }
    }
  });

  return stats;
};

export const checkNonAggregatableFieldExists = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: any,
  field: string,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const { asCurrentUser } = client;
  const index = indexPatternTitle;
  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
  };
  filterCriteria.push({ exists: { field } });

  const { body } = await asCurrentUser.search({
    index,
    size,
    body: searchBody,
  });
  // @ts-expect-error incorrect search response type
  return body.hits.total.value > 0;
};
