/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, uniqWith, pick, isEqual } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { type ChangePoint, RANDOM_SAMPLER_SEED } from '@kbn/ml-agg-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { ChangePointDuplicateGroup, ItemsetResult } from '../../../common/types';

const FREQUENT_ITEMS_FIELDS_LIMIT = 15;

interface FrequentItemsAggregation extends estypes.AggregationsSamplerAggregation {
  fi: {
    buckets: Array<{ key: Record<string, string[]>; doc_count: number; support: number }>;
  };
}

interface RandomSamplerAggregation {
  sample: FrequentItemsAggregation;
}

function isRandomSamplerAggregation(arg: unknown): arg is RandomSamplerAggregation {
  return isPopulatedObject(arg, ['sample']);
}

export function dropDuplicates(cps: ChangePoint[], uniqueFields: Array<keyof ChangePoint>) {
  return uniqWith(cps, (a, b) => isEqual(pick(a, uniqueFields), pick(b, uniqueFields)));
}

export function groupDuplicates(cps: ChangePoint[], uniqueFields: Array<keyof ChangePoint>) {
  const groups: ChangePointDuplicateGroup[] = [];

  for (const cp of cps) {
    const compareAttributes = pick(cp, uniqueFields);

    const groupIndex = groups.findIndex((g) => isEqual(g.keys, compareAttributes));
    if (groupIndex === -1) {
      groups.push({
        keys: compareAttributes,
        group: [cp],
      });
    } else {
      groups[groupIndex].group.push(cp);
    }
  }

  return groups;
}

export async function fetchFrequentItems(
  client: ElasticsearchClient,
  index: string,
  searchQuery: estypes.QueryDslQueryContainer,
  changePoints: ChangePoint[],
  timeFieldName: string,
  deviationMin: number,
  deviationMax: number,
  logger: Logger,
  // The default value of 1 means no sampling will be used
  sampleProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
) {
  // Sort change points by ascending p-value, necessary to apply the field limit correctly.
  const sortedChangePoints = changePoints.slice().sort((a, b) => {
    return (a.pValue ?? 0) - (b.pValue ?? 0);
  });

  // Get up to 15 unique fields from change points with retained order
  const fields = sortedChangePoints.reduce<string[]>((p, c) => {
    if (p.length < FREQUENT_ITEMS_FIELDS_LIMIT && !p.some((d) => d === c.fieldName)) {
      p.push(c.fieldName);
    }
    return p;
  }, []);

  const query = {
    bool: {
      minimum_should_match: 2,
      filter: [
        searchQuery,
        {
          range: {
            [timeFieldName]: {
              gte: deviationMin,
              lt: deviationMax,
            },
          },
        },
      ],
      should: sortedChangePoints.map((t) => {
        return { term: { [t.fieldName]: t.fieldValue } };
      }),
    },
  };

  const aggFields = fields.map((field) => ({
    field,
  }));

  const frequentItemsAgg: Record<string, estypes.AggregationsAggregationContainer> = {
    fi: {
      // @ts-expect-error `frequent_items` is not yet part of `AggregationsAggregationContainer`
      frequent_items: {
        minimum_set_size: 2,
        size: 200,
        minimum_support: 0.1,
        fields: aggFields,
      },
    },
  };

  // frequent items can be slow, so sample and use 10% min_support
  const randomSamplerAgg: Record<string, estypes.AggregationsAggregationContainer> = {
    sample: {
      // @ts-expect-error `random_sampler` is not yet part of `AggregationsAggregationContainer`
      random_sampler: {
        probability: sampleProbability,
        seed: RANDOM_SAMPLER_SEED,
      },
      aggs: frequentItemsAgg,
    },
  };

  const esBody = {
    query,
    aggs: sampleProbability < 1 ? randomSamplerAgg : frequentItemsAgg,
    size: 0,
    track_total_hits: true,
  };

  const body = await client.search<
    unknown,
    { sample: FrequentItemsAggregation } | FrequentItemsAggregation
  >(
    {
      index,
      size: 0,
      body: esBody,
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  if (body.aggregations === undefined) {
    logger.error(`Failed to fetch frequent_items, got: \n${JSON.stringify(body, null, 2)}`);
    emitError(`Failed to fetch frequent_items.`);
    return {
      fields: [],
      df: [],
      totalDocCount: 0,
    };
  }

  const totalDocCountFi = (body.hits.total as estypes.SearchTotalHits).value;

  const frequentItems = isRandomSamplerAggregation(body.aggregations)
    ? body.aggregations.sample.fi
    : body.aggregations.fi;

  const shape = frequentItems.buckets.length;
  let maximum = shape;
  if (maximum > 50000) {
    maximum = 50000;
  }

  const fiss = frequentItems.buckets;
  fiss.length = maximum;

  const results: ItemsetResult[] = [];

  fiss.forEach((fis) => {
    const result: ItemsetResult = {
      set: {},
      size: 0,
      maxPValue: 0,
      doc_count: 0,
      support: 0,
      total_doc_count: 0,
    };
    let maxPValue: number | undefined;
    Object.entries(fis.key).forEach(([key, value]) => {
      result.set[key] = value[0];

      const pValue = sortedChangePoints.find(
        (t) => t.fieldName === key && t.fieldValue === value[0]
      )?.pValue;

      if (pValue !== undefined && pValue !== null) {
        maxPValue = Math.max(maxPValue ?? 0, pValue);
      }
    });

    if (maxPValue === undefined) {
      return;
    }

    result.size = Object.keys(result.set).length;
    result.maxPValue = maxPValue;
    result.doc_count = fis.doc_count;
    result.support = fis.support;
    result.total_doc_count = totalDocCountFi;

    results.push(result);
  });

  results.sort((a, b) => {
    return b.doc_count - a.doc_count;
  });

  const uniqueFields = uniq(results.flatMap((r) => Object.keys(r.set)));

  return {
    fields: uniqueFields,
    df: results,
    totalDocCount: totalDocCountFi,
  };
}
