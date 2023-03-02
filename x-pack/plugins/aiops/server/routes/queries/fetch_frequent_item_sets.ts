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
import { type SignificantTerm, RANDOM_SAMPLER_SEED } from '@kbn/ml-agg-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { SignificantTermDuplicateGroup, ItemsetResult } from '../../../common/types';

const FREQUENT_ITEM_SETS_FIELDS_LIMIT = 15;

interface FrequentItemSetsAggregation extends estypes.AggregationsSamplerAggregation {
  fi: {
    buckets: Array<{ key: Record<string, string[]>; doc_count: number; support: number }>;
  };
}

interface RandomSamplerAggregation {
  sample: FrequentItemSetsAggregation;
}

function isRandomSamplerAggregation(arg: unknown): arg is RandomSamplerAggregation {
  return isPopulatedObject(arg, ['sample']);
}

export function dropDuplicates(cps: SignificantTerm[], uniqueFields: Array<keyof SignificantTerm>) {
  return uniqWith(cps, (a, b) => isEqual(pick(a, uniqueFields), pick(b, uniqueFields)));
}

export function groupDuplicates(
  cps: SignificantTerm[],
  uniqueFields: Array<keyof SignificantTerm>
) {
  const groups: SignificantTermDuplicateGroup[] = [];

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

export async function fetchFrequentItemSets(
  client: ElasticsearchClient,
  index: string,
  searchQuery: estypes.QueryDslQueryContainer,
  significantTerms: SignificantTerm[],
  timeFieldName: string,
  deviationMin: number,
  deviationMax: number,
  logger: Logger,
  // The default value of 1 means no sampling will be used
  sampleProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
) {
  // Sort significant terms by ascending p-value, necessary to apply the field limit correctly.
  const sortedSignificantTerms = significantTerms.slice().sort((a, b) => {
    return (a.pValue ?? 0) - (b.pValue ?? 0);
  });

  // Get up to 15 unique fields from significant terms with retained order
  const fields = sortedSignificantTerms.reduce<string[]>((p, c) => {
    if (p.length < FREQUENT_ITEM_SETS_FIELDS_LIMIT && !p.some((d) => d === c.fieldName)) {
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
      should: sortedSignificantTerms.map((t) => {
        return { term: { [t.fieldName]: t.fieldValue } };
      }),
    },
  };

  const aggFields = fields.map((field) => ({
    field,
  }));

  const frequentItemSetsAgg: Record<string, estypes.AggregationsAggregationContainer> = {
    fi: {
      // @ts-expect-error `frequent_item_sets` is not yet part of `AggregationsAggregationContainer`
      frequent_item_sets: {
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
      aggs: frequentItemSetsAgg,
    },
  };

  const esBody = {
    query,
    aggs: sampleProbability < 1 ? randomSamplerAgg : frequentItemSetsAgg,
    size: 0,
    track_total_hits: true,
  };

  const body = await client.search<
    unknown,
    { sample: FrequentItemSetsAggregation } | FrequentItemSetsAggregation
  >(
    {
      index,
      size: 0,
      body: esBody,
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  if (body.aggregations === undefined) {
    logger.error(`Failed to fetch frequent_item_sets, got: \n${JSON.stringify(body, null, 2)}`);
    emitError(`Failed to fetch frequent_item_sets.`);
    return {
      fields: [],
      df: [],
      totalDocCount: 0,
    };
  }

  const totalDocCountFi = (body.hits.total as estypes.SearchTotalHits).value;

  const frequentItemSets = isRandomSamplerAggregation(body.aggregations)
    ? body.aggregations.sample.fi
    : body.aggregations.fi;

  const shape = frequentItemSets.buckets.length;
  let maximum = shape;
  if (maximum > 50000) {
    maximum = 50000;
  }

  const fiss = frequentItemSets.buckets;
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

      const pValue = sortedSignificantTerms.find(
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
