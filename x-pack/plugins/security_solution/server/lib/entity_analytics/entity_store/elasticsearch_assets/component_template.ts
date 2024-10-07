/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import { getDefinitionForEntityType } from '../definition';
import { getEntityIndexMapping } from '../index_mappings';

const getComponentTemplateName = (definitionId: string) => `${definitionId}-latest@platform`;

interface Options {
  entityType: EntityType;
  namespace: string;
  esClient: ElasticsearchClient;
}

export const createEntityIndexComponentTemplate = ({
  entityType,
  namespace,
  esClient,
}: Options) => {
  const definition = getDefinitionForEntityType(entityType, namespace);
  const name = getComponentTemplateName(definition.id);
  const mappings = getEntityIndexMapping(entityType);
  return esClient.cluster.putComponentTemplate({
    name,
    body: {
      template: {
        mappings,
      },
    },
  });
};

export const deleteEntityIndexComponentTemplate = ({
  entityType,
  namespace,
  esClient,
}: Options) => {
  const definition = getDefinitionForEntityType(entityType, namespace);
  const name = getComponentTemplateName(definition.id);
  return esClient.cluster.deleteComponentTemplate(
    { name },
    {
      ignore: [404],
    }
  );
};
