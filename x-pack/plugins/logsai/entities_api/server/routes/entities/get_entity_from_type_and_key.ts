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
}: {
  esClient: ObservabilityElasticsearchClient;
  type: string;
  key: string;
  definitionEntities: DefinitionEntity[];
}): Promise<{
  entity: Entity;
  typeDefinition: EntityTypeDefinition;
  definitionEntities: DefinitionEntity[];
}> {
  const definitionsForType = definitionEntities.filter((definition) => definition.type === type);

  if (!definitionsForType.length) {
    throw notFound(`Could not find definition for type ${type}`);
  }

  const entityAsDefinition = definitionsForType.find((definition) => definition.key === key);

  if (entityAsDefinition) {
    return {
      entity: entityAsDefinition,
      typeDefinition: {
        displayName: entityAsDefinition.displayName,
        pivot: {
          type: entityAsDefinition.type,
          identityFields: entityAsDefinition.pivot.identityFields,
        },
      },
      definitionEntities: [entityAsDefinition],
    };
  }

  const firstDefinition = definitionsForType[0];

  return {
    entity: pivotEntityFromTypeAndKey({
      type,
      key,
      identityFields: firstDefinition.pivot.identityFields,
    }),
    typeDefinition: {
      displayName: firstDefinition.displayName,
      pivot: {
        type: firstDefinition.type,
        identityFields: firstDefinition.pivot.identityFields,
      },
    },
    definitionEntities: definitionsForType,
  };
}
