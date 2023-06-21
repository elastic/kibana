/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, pick, isEqual } from 'lodash';
import { group } from 'd3-array';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { type SignificantTerm } from '@kbn/ml-agg-utils';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { RANDOM_SAMPLER_SEED } from '../../../common/constants';
import type { SignificantTermDuplicateGroup, ItemsetResult } from '../../../common/types';

interface FrequentItemSetsAggregation extends estypes.AggregationsSamplerAggregation {
  fi: {
    buckets: Array<{ key: Record<string, string[]>; doc_count: number; support: number }>;
  };
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

export function getShouldClauses(significantTerms: SignificantTerm[]) {
  return Array.from(
    group(significantTerms, ({ fieldName }) => fieldName),
    ([field, values]) => ({ terms: { [field]: values.map((d) => d.fieldValue) } })
  );
}

export function getFrequentItemSetsAggFields(significantTerms: SignificantTerm[]) {
  return Array.from(
    group(significantTerms, ({ fieldName }) => fieldName),
    ([field, values]) => ({ field, include: values.map((d) => String(d.fieldValue)) })
  );
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
      should: getShouldClauses(sortedSignificantTerms),
    },
  };

  const frequentItemSetsAgg: Record<string, estypes.AggregationsAggregationContainer> = {
    fi: {
      frequent_item_sets: {
        minimum_set_size: 2,
        size: 200,
        minimum_support: 0.001,
        fields: getFrequentItemSetsAggFields(sortedSignificantTerms),
      },
    },
  };

  const { wrap, unwrap } = createRandomSamplerWrapper({
    probability: sampleProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  const esBody = {
    query,
    aggs: wrap(frequentItemSetsAgg),
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

  const frequentItemSets = unwrap(
    body.aggregations as Record<string, estypes.AggregationsAggregate>
  ) as FrequentItemSetsAggregation;

  const shape = frequentItemSets.fi.buckets.length;
  let maximum = shape;
  if (maximum > 50000) {
    maximum = 50000;
  }

  const fiss = frequentItemSets.fi.buckets;
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
