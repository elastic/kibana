/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export interface ESQLQuery {
  esql: string;
}
export function isESQLQuery(arg: unknown): arg is ESQLQuery {
  return isPopulatedObject(arg, ['esql']);
}
