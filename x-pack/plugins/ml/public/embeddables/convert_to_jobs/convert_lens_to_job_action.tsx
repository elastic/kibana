/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from 'rison-node';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { getJobsItemsFromEmbeddable } from '../../application/jobs/new_job/pages/job_from_lens';

export function convertLensToADJob(embeddable: IEmbeddable) {
  const { query, filters, to, from, vis } = getJobsItemsFromEmbeddable(embeddable);
  const visRison = rison.encode(vis as any);
  const queryRison = rison.encode(query);
  const filtersRison = rison.encode(filters);
  const url = `ml/jobs/new_job/from_lens?vis=${visRison}&from=${from}&to=${to}&query=${queryRison}&filters=${filtersRison}`;
  window.open(url, '_blank');
}
