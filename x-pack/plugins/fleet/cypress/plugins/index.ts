/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEsClientForTesting } from '@kbn/test';

const plugin: Cypress.PluginConfig = (on, config) => {
  const client = createEsClientForTesting({
    esUrl: config.env.ELASTICSEARCH_URL,
  });
  on('task', {
    async insertDoc({ index, doc, id }: { index: string; doc: any; id: string }) {
      return client.create({ id, document: doc, index, refresh: 'wait_for' });
    },
    async insertDocs({ index, docs }: { index: string; docs: any[] }) {
      const operations = docs.flatMap((doc) => [{ index: { _index: index } }, doc]);

      return client.bulk({ operations, refresh: 'wait_for' });
    },
    async deleteDocsByQuery({
      index,
      query,
      ignoreUnavailable = false,
    }: {
      index: string;
      query: any;
      ignoreUnavailable?: boolean;
    }) {
      return client.deleteByQuery({
        index,
        query,
        ignore_unavailable: ignoreUnavailable,
        refresh: true,
        conflicts: 'proceed',
      });
    },
  });
};

module.exports = plugin;
