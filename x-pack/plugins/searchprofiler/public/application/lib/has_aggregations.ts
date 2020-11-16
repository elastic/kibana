/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { ShardSerialized } from '../types';

export function hasAggregations(profileResponse: ShardSerialized[]) {
  const aggs = get(profileResponse, '[0].aggregations', []);
  return aggs.length > 0;
}
