/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CanvasServiceFactory } from '.';

export interface SearchService {
  search: DataPublicPluginStart['search'];
}

export const searchServiceFactory: CanvasServiceFactory<SearchService> = (
  setup,
  start,
  canvasSetup,
  canvasStart
) => {
  return {
    search: canvasStart.data.search,
  };
};
