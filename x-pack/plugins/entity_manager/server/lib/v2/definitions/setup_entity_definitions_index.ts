/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClient } from '@kbn/core/server';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from '../constants';

const definitionsIndexTemplate = {
  name: `${DEFINITIONS_ALIAS}-template`,
  index_patterns: [`${DEFINITIONS_ALIAS}-*`],
  _meta: {
    description: "Index template for the Elastic Entity Model's entity definitions index.",
    managed: true,
    managed_by: 'elastic_entity_model',
  },
  version: TEMPLATE_VERSION,
  template: {
    aliases: {
      [DEFINITIONS_ALIAS]: {},
    },
    mappings: {
      properties: {
        template_version: {
          type: 'short',
        },
        definition_type: {
          type: 'keyword',
        },
      },
    },
  },
};

const CURRENT_INDEX = `${DEFINITIONS_ALIAS}-${TEMPLATE_VERSION}` as const;

export async function setupEntityDefinitionsIndex(clusterClient: IClusterClient) {
  const esClient = clusterClient.asInternalUser;

  await esClient.indices.putIndexTemplate(definitionsIndexTemplate);

  const indices = await esClient.indices.get({
    index: `${DEFINITIONS_ALIAS}-*`,
  });
  const indexNames = Object.keys(indices);

  if (indexNames.includes(CURRENT_INDEX)) {
    return;
  }

  await esClient.indices.create({
    index: CURRENT_INDEX,
  });
}
