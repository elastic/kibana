/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { bootstrapIndices } from './indices';
import { putIndexTemplates } from './index_templates';
import { componentTemplates } from './component_templates';
import { putClusterSettings } from './cluster_settings';
import { ilmPolicy } from './ilm';
import { createReaderRole } from './security';

export async function applySetup(client: ElasticsearchClient): Promise<any> {
  return createReaderRole(client.security)
    .then(() => putClusterSettings(client.cluster))
    .then(() => {
      return ilmPolicy(client.ilm);
    })
    .then(() => {
      return componentTemplates(client.cluster).then((response) => {
        response.filter((r) => {
          if (!r.acknowledged) {
            throw new Error('incomplete component templates setup');
          }
        });
      });
    })
    .then(() => {
      return putIndexTemplates(client.indices);
    })
    .then(() => {
      return bootstrapIndices(client.indices);
    })
    .catch((error) => {
      throw new Error(error);
    });
}
