/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, uniqWith, pick, isEqual } from 'lodash';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ChangePoint } from '@kbn/ml-agg-utils';

function dropDuplicates(cp: ChangePoint[], uniqueFields: string[]) {
  return uniqWith(cp, (a, b) => isEqual(pick(a, uniqueFields), pick(b, uniqueFields)));
}

export async function generateItemsets(
  client: ElasticsearchClient,
  index: string,
  changePoints: ChangePoint[],
  timeFieldName: string,
  deviationMin: number,
  deviationMax: number
) {
  // first remove duplicates in sig terms - note this is not strictly perfect as there could
  // be conincidentally equal counts, but in general is ok...
  const terms = dropDuplicates(changePoints, [
    'doc_count',
    'bg_count',
    'total_doc_count',
    'total_bg_count',
  ]);
  // console.log('changePoints-length', changePoints.length);
  // console.log('terms-length', terms.length);

  // get unique fields that are left
  const fields = [...new Set(terms.map((t) => t.fieldName))];

  const query = {
    bool: {
      filter: [
        {
          range: {
            [timeFieldName]: {
              gte: deviationMin,
              lt: deviationMax,
            },
          },
        },
      ],
    },
  };

  const condition = 'should';
  query.bool[condition] = terms.map((t) => {
    return { term: { [t.fieldName]: t.fieldValue } };
  });

  const aggFields = fields.map((field) => ({
    field,
  }));

  // total_doc_count = terms['total_doc_count'][0]
  const totalDocCount = 1;
  const minDocCount = 50000;
  let sampleProbability = 1;

  if (totalDocCount > minDocCount) {
    sampleProbability = Math.min(0.5, minDocCount / totalDocCount);
  }

  // frequent items can be slow, so sample and use 10% min_support
  const agg = {
    sample: {
      random_sampler: {
        probability: sampleProbability,
      },
      aggs: {
        fi: {
          frequent_items: {
            size: 200,
            minimum_support: 0.1,
            fields: aggFields,
          },
        },
      },
    },
  };

  const body = await client.search(
    {
      index,
      size: 0,
      body: {
        query,
        aggs: agg,
        size: 0,
        track_total_hits: true,
      },
    },
    { maxRetries: 0 }
  );

  const totalDocCountFi = body.hits.total?.value;

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

    result.size = Object.keys(result).length;
    result.maxPValue = maxPValue;
    result.doc_count = fis.doc_count;
    result.support = fis.support;
    result.total_doc_count = totalDocCountFi;

    results.push(result);
  });

  return {
    fields: uniq(results.flatMap((r) => Object.keys(r.set))),
    df: results,
    totalDocCount: totalDocCountFi,
  };
}

export interface ItemsetResult {
  set: Record<string, string>;
  size: number;
  maxPValue: number;
  doc_count: number;
  support: number;
  total_doc_count: number;
}
