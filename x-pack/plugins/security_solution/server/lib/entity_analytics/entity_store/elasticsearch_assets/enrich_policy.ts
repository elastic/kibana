/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EnrichPutPolicyRequest } from '@elastic/elasticsearch/lib/api/types';
import { getEntitiesIndexName } from '../utils';
import type { UnitedEntityDefinition } from '../united_entity_definitions';

type DefinitionMetadata = Pick<UnitedEntityDefinition, 'namespace' | 'entityType' | 'version'>;

export const getFieldRetentionEnrichPolicyName = ({
  namespace,
  entityType,
  version,
}: DefinitionMetadata): string => {
  return `entity_store_field_retention_${entityType}_${namespace}_v${version}`;
};

const getFieldRetentionEnrichPolicy = (
  unitedDefinition: UnitedEntityDefinition
): EnrichPutPolicyRequest => {
  const { namespace, entityType, fieldRetentionDefinition } = unitedDefinition;
  return {
    name: getFieldRetentionEnrichPolicyName(unitedDefinition),
    match: {
      indices: getEntitiesIndexName(entityType, namespace),
      match_field: fieldRetentionDefinition.matchField,
      enrich_fields: fieldRetentionDefinition.fields.map(({ field }) => field),
    },
  };
};

export const createFieldRetentionEnrichPolicy = async ({
  esClient,
  unitedDefinition,
}: {
  esClient: ElasticsearchClient;
  unitedDefinition: UnitedEntityDefinition;
}) => {
  const policy = getFieldRetentionEnrichPolicy(unitedDefinition);
  return esClient.enrich.putPolicy(policy);
};

export const executeFieldRetentionEnrichPolicy = async ({
  esClient,
  unitedDefinition,
  logger,
}: {
  unitedDefinition: DefinitionMetadata;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<{ executed: boolean }> => {
  const name = getFieldRetentionEnrichPolicyName(unitedDefinition);
  try {
    await esClient.enrich.executePolicy({ name });
    return { executed: true };
  } catch (e) {
    if (e.statusCode === 404) {
      return { executed: false };
    }
    logger.error(
      `Error executing field retention enrich policy for ${unitedDefinition.entityType}: ${e.message}`
    );
    throw e;
  }
};

export const deleteFieldRetentionEnrichPolicy = async ({
  unitedDefinition,
  esClient,
  logger,
  attempts = 5,
  delayMs = 2000,
}: {
  unitedDefinition: DefinitionMetadata;
  esClient: ElasticsearchClient;
  logger: Logger;
  attempts?: number;
  delayMs?: number;
}) => {
  const name = getFieldRetentionEnrichPolicyName(unitedDefinition);
  let currentAttempt = 1;
  while (currentAttempt <= attempts) {
    try {
      await esClient.enrich.deletePolicy({ name }, { ignore: [404] });
      return;
    } catch (e) {
      // a 429 status code indicates that the enrich policy is being executed
      if (currentAttempt === attempts || e.statusCode !== 429) {
        logger.error(
          `Error deleting enrich policy ${name}: ${e.message} after ${currentAttempt} attempts`
        );
        throw e;
      }

      logger.info(
        `Enrich policy ${name} is being executed, waiting for it to finish before deleting`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      currentAttempt++;
    }
  }
};
