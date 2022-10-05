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
import type { ChangePoint, FieldValuePair } from '@kbn/ml-agg-utils';

interface FrequentItemsAggregation extends estypes.AggregationsSamplerAggregation {
  fi: {
    buckets: Array<{ key: Record<string, string[]>; doc_count: number; support: number }>;
  };
}

export function dropDuplicates(cps: ChangePoint[], uniqueFields: Array<keyof ChangePoint>) {
  return uniqWith(cps, (a, b) => isEqual(pick(a, uniqueFields), pick(b, uniqueFields)));
}

interface ChangePointDuplicateGroup {
  keys: Pick<ChangePoint, keyof ChangePoint>;
  group: ChangePoint[];
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
  emitError: (m: string) => void
) {
  // get unique fields from change points
  const fields = [...new Set(changePoints.map((t) => t.fieldName))];

  // TODO add query params
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
      should: changePoints.map((t) => {
        return { term: { [t.fieldName]: t.fieldValue } };
      }),
    },
  };

  const aggFields = fields.map((field) => ({
    field,
  }));

  const totalDocCount = changePoints[0].total_doc_count;
  const minDocCount = 50000;
  let sampleProbability = 1;

  if (totalDocCount > minDocCount) {
    sampleProbability = Math.min(0.5, minDocCount / totalDocCount);
  }

  logger.debug(`frequent_items sample probability: ${sampleProbability}`);

  // frequent items can be slow, so sample and use 10% min_support
  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
    sample: {
      random_sampler: {
        probability: sampleProbability,
      },
      aggs: {
        fi: {
          // @ts-expect-error `frequent_items` is not yet part of `AggregationsAggregationContainer`
          frequent_items: {
            minimum_set_size: 2,
            size: 200,
            minimum_support: 0.1,
            fields: aggFields,
          },
        },
      },
    },
  };

  const body = await client.search<unknown, { sample: FrequentItemsAggregation }>(
    {
      index,
      size: 0,
      body: {
        query,
        aggs,
        size: 0,
        track_total_hits: true,
      },
    },
    { maxRetries: 0 }
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

  const shape = body.aggregations.sample.fi.buckets.length;
  let maximum = shape;
  if (maximum > 50000) {
    maximum = 50000;
  }

  const fiss = body.aggregations.sample.fi.buckets;
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

      const pValue = changePoints.find(
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

export interface ItemsetResult {
  set: Record<FieldValuePair['fieldName'], FieldValuePair['fieldValue']>;
  size: number;
  maxPValue: number;
  doc_count: number;
  support: number;
  total_doc_count: number;
}
