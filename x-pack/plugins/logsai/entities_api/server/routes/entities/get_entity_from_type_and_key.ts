/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { pivotEntityFromTypeAndKey } from './get_esql_identity_commands';
import { DefinitionEntity, Entity, EntityTypeDefinition } from '../../../common/entities';

export async function getEntityFromTypeAndKey({
  esClient,
  type,
  key,
  definitionEntities,
  typeDefinitions,
}: {
  esClient: ObservabilityElasticsearchClient;
  type: string;
  key: string;
  definitionEntities: DefinitionEntity[];
  typeDefinitions: EntityTypeDefinition[];
}): Promise<{
  entity: Entity;
  typeDefinition: EntityTypeDefinition;
}> {
  const typeDefinition = typeDefinitions.find((typeDef) => typeDef.pivot.type === type);

  if (!typeDefinition) {
    throw notFound(`Could not find type definition for type ${type}`);
  }

  const definitionsForType = definitionEntities.filter((definition) => definition.type === type);

  if (!definitionsForType.length) {
    throw notFound(`Could not find definition for type ${type}`);
  }

  const entityAsDefinition = definitionsForType.find((definition) => definition.key === key);

  if (entityAsDefinition) {
    return {
      entity: entityAsDefinition,
      typeDefinition,
    };
  }

  return {
    entity: pivotEntityFromTypeAndKey({
      type,
      key,
      identityFields: typeDefinition.pivot.identityFields,
      displayNameTemplate: typeDefinition.displayNameTemplate,
    }),
    typeDefinition,
  };
}
