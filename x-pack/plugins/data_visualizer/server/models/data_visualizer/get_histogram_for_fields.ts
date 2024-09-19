/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { estypes } from '@elastic/elasticsearch';
import { get } from 'lodash';
import { ChartData, ChartRequestAgg, HistogramField, NumericColumnStatsMap } from '../../types';
import { KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/common';
import { stringHash } from '../../../common/utils/string_utils';
import {
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../common/utils/object_utils';
import { MAX_CHART_COLUMNS } from './constants';

export const getAggIntervals = async (
  { asCurrentUser }: IScopedClusterClient,
  indexPatternTitle: string,
  query: any,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings?: estypes.MappingRuntimeFields
): Promise<NumericColumnStatsMap> => {
  const numericColumns = fields.filter((field) => {
    return field.type === KBN_FIELD_TYPES.NUMBER || field.type === KBN_FIELD_TYPES.DATE;
  });

  if (numericColumns.length === 0) {
    return {};
  }

  const minMaxAggs = numericColumns.reduce((aggs, c) => {
    const id = stringHash(c.fieldName);
    aggs[id] = {
      stats: {
        field: c.fieldName,
      },
    };
    return aggs;
  }, {} as Record<string, object>);

  const { body } = await asCurrentUser.search({
    index: indexPatternTitle,
    size: 0,
    body: {
      query,
      aggs: buildSamplerAggregation(minMaxAggs, samplerShardSize),
      size: 0,
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    },
  });

  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const aggregations = aggsPath.length > 0 ? get(body.aggregations, aggsPath) : body.aggregations;

  return Object.keys(aggregations).reduce((p, aggName) => {
    const stats = [aggregations[aggName].min, aggregations[aggName].max];
    if (!stats.includes(null)) {
      const delta = aggregations[aggName].max - aggregations[aggName].min;

      let aggInterval = 1;

      if (delta > MAX_CHART_COLUMNS || delta <= 1) {
        aggInterval = delta / (MAX_CHART_COLUMNS - 1);
      }

      p[aggName] = { interval: aggInterval, min: stats[0], max: stats[1] };
    }

    return p;
  }, {} as NumericColumnStatsMap);
};

export const getHistogramsForFields = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: any,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const { asCurrentUser } = client;
  const aggIntervals = await getAggIntervals(
    client,
    indexPatternTitle,
    query,
    fields,
    samplerShardSize,
    runtimeMappings
  );

  const chartDataAggs = fields.reduce((aggs, field) => {
    const fieldName = field.fieldName;
    const fieldType = field.type;
    const id = stringHash(fieldName);
    if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
      if (aggIntervals[id] !== undefined) {
        aggs[`${id}_histogram`] = {
          histogram: {
            field: fieldName,
            interval: aggIntervals[id].interval !== 0 ? aggIntervals[id].interval : 1,
          },
        };
      }
    } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
      if (fieldType === KBN_FIELD_TYPES.STRING) {
        aggs[`${id}_cardinality`] = {
          cardinality: {
            field: fieldName,
          },
        };
      }
      aggs[`${id}_terms`] = {
        terms: {
          field: fieldName,
          size: MAX_CHART_COLUMNS,
        },
      };
    }
    return aggs;
  }, {} as Record<string, ChartRequestAgg>);

  if (Object.keys(chartDataAggs).length === 0) {
    return [];
  }

  const { body } = await asCurrentUser.search({
    index: indexPatternTitle,
    size: 0,
    body: {
      query,
      aggs: buildSamplerAggregation(chartDataAggs, samplerShardSize),
      size: 0,
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    },
  });

  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const aggregations = aggsPath.length > 0 ? get(body.aggregations, aggsPath) : body.aggregations;

  const chartsData: ChartData[] = fields.map((field): ChartData => {
    const fieldName = field.fieldName;
    const fieldType = field.type;
    const id = stringHash(field.fieldName);

    if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
      if (aggIntervals[id] === undefined) {
        return {
          type: 'numeric',
          data: [],
          interval: 0,
          stats: [0, 0],
          id: fieldName,
        };
      }

      return {
        data: aggregations[`${id}_histogram`].buckets,
        interval: aggIntervals[id].interval,
        stats: [aggIntervals[id].min, aggIntervals[id].max],
        type: 'numeric',
        id: fieldName,
      };
    } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
      return {
        type: fieldType === KBN_FIELD_TYPES.STRING ? 'ordinal' : 'boolean',
        cardinality:
          fieldType === KBN_FIELD_TYPES.STRING ? aggregations[`${id}_cardinality`].value : 2,
        data: aggregations[`${id}_terms`].buckets,
        id: fieldName,
      };
    }

    return {
      type: 'unsupported',
      id: fieldName,
    };
  });

  return chartsData;
};
