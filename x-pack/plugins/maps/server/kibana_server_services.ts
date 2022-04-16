/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/server';
import { StartDeps } from './types';

let coreStart: CoreStart;
let pluginsStart: StartDeps;
export function setStartServices(core: CoreStart, plugins: StartDeps) {
  coreStart = core;
  pluginsStart = plugins;
}

export const getSavedObjectClient = (extraTypes?: string[]) => {
  return coreStart.savedObjects.createInternalRepository(extraTypes);
};

export const getIndexPatternsServiceFactory = () =>
  pluginsStart.data.indexPatterns.indexPatternsServiceFactory;
export const getElasticsearch = () => coreStart.elasticsearch;
