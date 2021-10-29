/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

import { Client } from '@elastic/elasticsearch';
import { getObserverDefaults } from '@elastic/apm-synthtrace';
import { synthtraceEsClient as createSynthtraceEsClient } from '../../../../../test/apm_api_integration/common/synthtrace_es_client';
import generateDataServiceInventory from '../integration/read_only_user/service_inventory/generate_data';
import {
  esArchiverLoad,
  esArchiverUnload,
  esArchiverResetKibana,
} from '../tasks/es_archiver';

type Fields = ReturnType<typeof getObserverDefaults>;
type Range = { from: number; to: number };

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = async (on: any, config: any) => {
  const client = new Client({
    node: 'http://localhost:9220',
    auth: { username: 'elastic', password: 'changeme' },
  });
  const synthtraceEsClient = await createSynthtraceEsClient(
    {
      getService: () => client,
    } as any,
    { useClassicIndices: false }
  );
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  on('task', {
    'esArchiver:load': async () => {
      console.log('Loading esArchiver...');
      await esArchiverLoad('apm_8.0.0');
      return null;
    },
    'esArchiver:unload': async () => {
      console.log('Removing esArchiver...');
      await esArchiverUnload('apm_8.0.0');
      return null;
    },
    'esArchiver:resetKibana': async () => {
      console.log('Emptying Kibana index...');
      await esArchiverResetKibana();
      return null;
    },
    'synthtrace:index': async (events: Fields[]) => {
      await synthtraceEsClient.index(events);
      return null;
    },
    'synthtrace:clean': async () => {
      await synthtraceEsClient.clean();
      return null;
    },
    'synthtrace:index:service_inventory': async (range: Range) => {
      const events = generateDataServiceInventory(range);
      await synthtraceEsClient.index(events);
      return null;
    },
  });
};
