/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, ISavedObjectsRepository } from 'kibana/server';
import { SavedObjectsClient } from '../../../../src/core/server';
import { IndexPatternsCommonService } from '../../../../src/plugins/data/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IndexPatternsServiceStart } from '../../../../src/plugins/data/server/index_patterns';

let internalRepository: ISavedObjectsRepository;
export const setInternalRepository = (
  createInternalRepository: (extraTypes?: string[]) => ISavedObjectsRepository
) => {
  internalRepository = createInternalRepository();
};
export const getInternalRepository = () => internalRepository;

let indexPatternsService: IndexPatternsCommonService;
export const setIndexPatternsService = async (
  indexPatternsServiceFactory: IndexPatternsServiceStart['indexPatternsServiceFactory'],
  elasticsearchClient: ElasticsearchClient
) => {
  indexPatternsService = await indexPatternsServiceFactory(
    new SavedObjectsClient(getInternalRepository()),
    elasticsearchClient
  );
};
export const getIndexPatternsService = () => indexPatternsService;
