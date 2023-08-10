/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsArchiver } from '@kbn/es-archiver';
import { KbnClient } from '@kbn/test';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

export const esArchiver = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): EsArchiver => {
  const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

  const client = new Client({
    node: config.env.ELASTICSEARCH_URL,
    Connection: HttpConnection,
  });

  const kbnClient = new KbnClient({
    log,
    url: config.env.CYPRESS_BASE_URL as string,
  });

  const esArchiverInstance = new EsArchiver({
    log,
    client,
    kbnClient,
    baseDir: '../../../test/security_solution_cypress/es_archives',
  });

  on('task', {
    esArchiverLoad: async (archiveName) => esArchiverInstance.load(archiveName),
    esArchiverUnload: async (archiveName) => esArchiverInstance.unload(archiveName),
    esArchiverResetKibana: async () => esArchiverInstance.emptyKibanaIndex(),
    esArchiverCCSLoad: async (archiveName) => {
      const ccsEsArchiverInstance = new EsArchiver({
        client: new Client({
          node: config.env.CCS_ELASTICSEARCH_URL,
          Connection: HttpConnection,
        }),
        log,
        kbnClient: new KbnClient({
          log,
          url: config.env.CCS_KIBANA_URL,
        }),
        baseDir: '../../../test/security_solution_cypress/es_archives',
      });

      return ccsEsArchiverInstance.load(archiveName);
    },
  });

  return esArchiverInstance;
};
