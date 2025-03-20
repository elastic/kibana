/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';

export interface GroupByFields {
  [x: string]: any;
}

export const unflattenObject = <T extends object = GroupByFields>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);
