/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promisify } from 'util';

import fs from 'fs';

import fetch from 'node-fetch';
import { createEsClientForTesting } from '@kbn/test';

const plugin: Cypress.PluginConfig = (on, config) => {
  const client = createEsClientForTesting({
    esUrl: config.env.ELASTICSEARCH_URL,
  });

  async function kibanaFetch(opts: {
    method: string;
    path: string;
    body?: any;
    contentType?: string;
  }) {
    const { method, path, body, contentType } = opts;
    const Authorization = `Basic ${Buffer.from(
      `elastic:${config.env.ELASTICSEARCH_PASSWORD}`
    ).toString('base64')}`;

    const url = `${config.env.KIBANA_URL}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'kbn-xsrf': 'cypress',
        'Content-Type': contentType || 'application/json',
        Authorization,
      },
      ...(body ? { body } : {}),
    });

    return res.json();
  }
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
    async installTestPackage(packageName: string) {
      const zipPath = require.resolve('../packages/' + packageName + '.zip');
      const zipContent = await promisify(fs.readFile)(zipPath, 'base64');
      return kibanaFetch({
        method: 'POST',
        path: '/api/fleet/epm/packages',
        body: Buffer.from(zipContent, 'base64'),
        contentType: 'application/zip',
      });
    },

    async uninstallTestPackage(packageName: string) {
      return kibanaFetch({
        method: 'DELETE',
        path: `/api/fleet/epm/packages/${packageName}`,
      });
    },
  });
};

module.exports = plugin;
