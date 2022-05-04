/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from 'rison-node';
import type { Embeddable } from '@kbn/lens-plugin/public';
import { getJobsItemsFromEmbeddable } from './create_job';

export function convertLensToADJob(embeddable: Embeddable) {
  const { query, filters, to, from, vis } = getJobsItemsFromEmbeddable(embeddable);
  const visRison = rison.encode<any>(vis);
  const queryRison = rison.encode(query);
  const filtersRison = rison.encode(filters);

  const params = [
    ['vis', visRison],
    ['from', from],
    ['to', to],
    ['query', queryRison],
    ['filters', filtersRison],
  ]
    .map(([a, b]) => `${a}=${b}`)
    .join('&');

  const url = `ml/jobs/new_job/from_lens?${params}`;
  window.open(url, '_blank');
}
