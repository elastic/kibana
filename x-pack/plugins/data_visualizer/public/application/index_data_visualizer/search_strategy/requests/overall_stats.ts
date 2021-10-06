/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { get } from 'lodash';
import {
  buildBaseFilterCriteria,
  buildSamplerAggregation,
  getSafeAggregationName,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { getDatafeedAggregations } from '../../../../../common/utils/datafeed_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import { IKibanaSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { AggregatableField, NonAggregatableField } from '../../types/overall_stats';
import { AggCardinality, FieldData, Aggs } from '../../../../../common/search_strategy/types';

export const checkAggregatableFieldsExistRequest = (
  indexPatternTitle: string,
  query: any,
  aggregatableFields: string[],
  samplerShardSize: number,
  timeFieldName: string | undefined,
  earliestMs?: number,
  latestMs?: number,
  datafeedConfig?: estypes.MlDatafeed,
  runtimeMappings?: estypes.MappingRuntimeFields
): estypes.SearchRequest => {
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

  return {
    index,
    track_total_hits: true,
    size,
    body: searchBody,
  };
};

export const processAggregatableFieldsExistResponse = (
  body: estypes.SearchResponse,
  aggregatableFields: string[],
  samplerShardSize: number,
  datafeedConfig?: estypes.MlDatafeed
) => {
  const aggregations = body.aggregations;
  // @ts-expect-error incorrect search response type
  const totalCount = body.hits.total;
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

  return stats as {
    totalCount: number;
    aggregatableExistsFields: AggregatableField[];
    aggregatableNotExistsFields: AggregatableField[];
  };
};

export const checkNonAggregatableFieldExistsRequest = (
  indexPatternTitle: string,
  query: any,
  field: string,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  runtimeMappings?: estypes.MappingRuntimeFields
): estypes.SearchRequest => {
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

  return {
    index,
    size,
    body: searchBody,
  };
};

export const processNonAggregatableFieldsExistResponse = (
  results: IKibanaSearchResponse[],
  nonAggregatableFields: string[]
) => {
  const stats = {
    nonAggregatableExistsFields: [] as NonAggregatableField[],
    nonAggregatableNotExistsFields: [] as NonAggregatableField[],
  };

  nonAggregatableFields.forEach((fieldName) => {
    const existsInDocs = results.find((r) => r.rawResponse.fieldName === fieldName) !== undefined;
    const fieldData: NonAggregatableField = {
      fieldName,
      existsInDocs,
    };
    if (existsInDocs === true) {
      stats.nonAggregatableExistsFields.push(fieldData);
    } else {
      stats.nonAggregatableNotExistsFields.push(fieldData);
    }
  });
  return stats;
};
