/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { anomalyAggsFetcher, IOptions } from './fetcher';
import { anomalyAggsTransform } from './transform';

export async function getAnomalyAggs(options: IOptions) {
  const response = await anomalyAggsFetcher(options);
  return anomalyAggsTransform(response);
}
