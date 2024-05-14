/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, ElasticsearchClient } from '@kbn/core/server';

interface TranslationsStartDeps {
  elasticsearch: ElasticsearchClient;
}

class TranslationsPlugin {
  public setup(core: CoreSetup<TranslationsStartDeps>) {
    void core.getStartServices().then(async ([start]) => {
      const esClient = start.elasticsearch.client.asInternalUser;
      const res = await esClient.search({
        index: '.kibana',
        query: {
          bool: {
            must: {
              term: {
                type: 'boom',
              },
            },
          },
        },
      });

      if (!res.hits.hits.length) {
        await esClient.index({ index: '.kibana', document: { type: 'boom' } });
        setImmediate(() => {
          throw new Error('BOOM document did not exist, throwing!');
        });
      }
    });

    return {};
  }

  public start() {
    return {};
  }
}

export const plugin = async () => new TranslationsPlugin();
