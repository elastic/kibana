/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ElasticsearchClient,
  ISavedObjectsRepository,
  KibanaRequest,
  SavedObjectsClientContract,
} from 'kibana/server';
import { IndexPatternsService } from '../../../../src/plugins/data/server';

let internalRepository: ISavedObjectsRepository;
export const setInternalRepository = (
  createInternalRepository: (extraTypes?: string[]) => ISavedObjectsRepository
) => {
  internalRepository = createInternalRepository();
};
export const getInternalRepository = () => internalRepository;

let indexPatternsService: IndexPatternsService;
export const setIndexPatternsService = async (
  indexPatternsServiceFactory: (
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) => Promise<IndexPatternsService>,
  elasticsearchClient: ElasticsearchClient
) => {
  const savedObjectsClient = getInternalRepository();
  indexPatternsService = await indexPatternsServiceFactory(savedObjectsClient, elasticsearchClient);
};
export const getIndexPatternsService = () => indexPatternsService;
