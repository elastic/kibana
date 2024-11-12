/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { UnitedEntityDefinition } from '../united_entity_definitions';

const getComponentTemplateName = (definitionId: string) => `${definitionId}-latest@platform`;

interface Options {
  unitedDefinition: UnitedEntityDefinition;
  esClient: ElasticsearchClient;
}

export const createEntityIndexComponentTemplate = ({ unitedDefinition, esClient }: Options) => {
  const { entityManagerDefinition, indexMappings } = unitedDefinition;
  const name = getComponentTemplateName(entityManagerDefinition.id);
  return esClient.cluster.putComponentTemplate({
    name,
    body: {
      template: {
        settings: {
          hidden: true,
        },
        mappings: indexMappings,
      },
    },
  });
};

export const deleteEntityIndexComponentTemplate = ({ unitedDefinition, esClient }: Options) => {
  const { entityManagerDefinition } = unitedDefinition;
  const name = getComponentTemplateName(entityManagerDefinition.id);
  return esClient.cluster.deleteComponentTemplate(
    { name },
    {
      ignore: [404],
    }
  );
};
