/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/public';

let fieldListCache: DatatableColumn[];

export const addToCache = (list: DatatableColumn[]) => {
  fieldListCache = [...list];
};

export const retrieveFromCache = () => {
  return fieldListCache;
};
