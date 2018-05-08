/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { singleLineScript } from '../lib/single_line_script';

/*
watch.transform.script.inline
 */
function buildInline({ aggType, hasTermsAgg, thresholdComparator }) {
  let script = '';

  if (aggType === 'count' && !hasTermsAgg) {
    script = `
      HashMap result = new HashMap();
      result.result = ctx.payload.hits.total;

      return result;
    `;
  }

  if (aggType === 'count' && hasTermsAgg) {
    script = `
      HashMap result = new HashMap();
      ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets;
      ArrayList filteredHits = new ArrayList();

      for (int i = 0; i < arr.length; i++) {
        HashMap filteredHit = new HashMap();
        filteredHit.key = arr[i].key;
        filteredHit.value = arr[i].doc_count;
        if (filteredHit.value ${thresholdComparator} params.threshold) {
          filteredHits.add(filteredHit);
        }
      }
      result.results = filteredHits;

      return result;
    `;
  }

  if (aggType !== 'count' && !hasTermsAgg) {
    script = `
      HashMap result = new HashMap();
      result.result = ctx.payload.aggregations.metricAgg.value;

      return result;
    `;
  }

  if (aggType !== 'count' && hasTermsAgg) {
    script = `
      HashMap result = new HashMap();
      ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets;
      ArrayList filteredHits = new ArrayList();

      for (int i = 0; i < arr.length; i++) {
        HashMap filteredHit = new HashMap();
        filteredHit.key = arr[i].key;
        filteredHit.value = arr[i]['metricAgg'].value;
        if (filteredHit.value ${thresholdComparator} params.threshold) {
          filteredHits.add(filteredHit);
        }
      }
      result.results = filteredHits;

      return result;
    `;
  }

  return singleLineScript(script);
}

/*
watch.transform.script.params
 */
function buildParams({ threshold }) {
  return {
    threshold
  };
}

/*
watch.transform
 */
export function buildTransform(watch) {
  return {
    script: {
      source: buildInline(watch),
      params: buildParams(watch)
    }
  };
}
