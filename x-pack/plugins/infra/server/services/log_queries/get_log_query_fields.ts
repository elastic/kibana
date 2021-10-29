/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, ElasticsearchClient } from 'src/core/server';
import { InfraSources } from '../../lib/sources';
import { resolveLogSourceConfiguration } from '../../../common/log_sources';
import { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';

export interface LogQueryFields {
  indexPattern: string;
}

export const createGetLogQueryFields = (sources: InfraSources, framework: KibanaFramework) => {
  return async (
    sourceId: string,
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ): Promise<LogQueryFields> => {
    const source = await sources.getSourceConfiguration(savedObjectsClient, sourceId);
    const resolvedLogSourceConfiguration = await resolveLogSourceConfiguration(
      source.configuration,
      await framework.getIndexPatternsService(savedObjectsClient, elasticsearchClient)
    );

    return {
      indexPattern: resolvedLogSourceConfiguration.indices,
    };
  };
};

export type GetLogQueryFields = ReturnType<typeof createGetLogQueryFields>;
