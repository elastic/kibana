/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import LRU from 'lru-cache';
import { IndexFieldDescriptor } from './adapters/fields';

const DEFAULT_TTL_IN_MINUTES = 1440; // A day

export const createIntervalCache = new LRU<string, number>({
  max: 100, // 100 module date combinations
  maxAge: DEFAULT_TTL_IN_MINUTES * 60 * 1000,
});

export const aggregationsToModulesCache = new LRU<string, string[]>({
  max: 100, // 100 module date combinations
  maxAge: DEFAULT_TTL_IN_MINUTES * 60 * 1000,
});

export const getIndexFieldsCache = new LRU<string, IndexFieldDescriptor[]>({
  max: 10, // 10 indices
  maxAge: 15 * 60 * 1000,
});

export const clearAllCaches = () => {
  createIntervalCache.reset();
  aggregationsToModulesCache.reset();
  getIndexFieldsCache.reset();
};
