/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, ISavedObjectsRepository } from 'kibana/server';
import { SavedObjectsClient } from '../../../../src/core/server';
import {
  IndexPatternsCommonService,
  IndexPatternsServiceStart,
} from '../../../../src/plugins/data/server';

let internalRepository: ISavedObjectsRepository;
export const setInternalRepository = (
  createInternalRepository: (extraTypes?: string[]) => ISavedObjectsRepository
) => {
  internalRepository = createInternalRepository();
};
export const getInternalRepository = () => internalRepository;

let esClient: ElasticsearchClient;
let indexPatternsService: IndexPatternsCommonService;
export const setIndexPatternsService = async (
  indexPatternsServiceFactory: IndexPatternsServiceStart['indexPatternsServiceFactory'],
  elasticsearchClient: ElasticsearchClient
) => {
  esClient = elasticsearchClient;
  indexPatternsService = await indexPatternsServiceFactory(
    new SavedObjectsClient(getInternalRepository()),
    elasticsearchClient
    // todo does this need to pass request
  );
};
export const getIndexPatternsService = () => indexPatternsService;
export const getESClient = () => esClient;
