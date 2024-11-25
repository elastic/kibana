/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from '../constants';
import {
  EntitySourceDefinition,
  CreateOperationStatus,
  ReadOperationStatus,
  StoredEntitySourceDefinition,
} from '../types';
import { runESQLQuery } from '../run_esql_query';

export async function storeSourceDefinition(
  source: EntitySourceDefinition,
  clusterClient: IScopedClusterClient,
  logger: Logger
): Promise<CreateOperationStatus<EntitySourceDefinition>> {
  try {
    const esClient = clusterClient.asInternalUser;

    const sources = await runESQLQuery('fetch source definition for conflict check', {
      esClient,
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _id | WHERE definition_type == "source" AND _id == "source:${source.id}"`,
      logger,
    });

    if (sources.length !== 0) {
      return {
        status: 'conflict',
        reason: `An entity source definition with the ID "${source.id}" already exists.`,
      };
    }

    const definition: StoredEntitySourceDefinition = {
      template_version: TEMPLATE_VERSION,
      definition_type: 'source',
      source,
    };

    await esClient.index({
      index: DEFINITIONS_ALIAS,
      id: `source:${definition.source.id}`,
      document: definition,
    });

    return {
      status: 'success',
      resource: definition.source,
    };
  } catch (error) {
    return {
      status: 'error',
      reason: `${error.name}: ${error.message}`,
    };
  }
}

export interface ReadSourceDefinitionOptions {
  type?: string;
}

export async function readSourceDefinitions(
  clusterClient: IScopedClusterClient,
  logger: Logger,
  options?: ReadSourceDefinitionOptions
): Promise<ReadOperationStatus<EntitySourceDefinition[]>> {
  try {
    const esClient = clusterClient.asInternalUser;

    const typeFilter = options?.type ? `AND source.type_id == "${options.type}"` : '';
    const sources = await runESQLQuery<StoredEntitySourceDefinition>(
      'fetch all source definitions',
      {
        esClient,
        query: `FROM ${DEFINITIONS_ALIAS} | WHERE definition_type == "source" ${typeFilter}`,
        logger,
      }
    );

    return {
      status: 'success',
      resource: sources.map((storedTypeDefinition) => storedTypeDefinition.source),
    };
  } catch (error) {
    return {
      status: 'error',
      reason: `${error.name}: ${error.message}`,
    };
  }
}
