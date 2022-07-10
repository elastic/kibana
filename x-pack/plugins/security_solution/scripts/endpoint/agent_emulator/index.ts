/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, RunContext } from '@kbn/dev-cli-runner';
import { ActionResponderService } from './services/action_responder';
import { AgentKeepAliveService } from './services/keep_alive';
import { EmulatorRunContext } from './services/emulator_run_context';
import { HORIZONTAL_LINE } from '../common/constants';

export const cli = () => {
  run(
    async (cliContext: RunContext) => {
      cliContext.log.write(`
${HORIZONTAL_LINE}
 Endpoint Agent Emulator
${HORIZONTAL_LINE}
`);

      const emulatorContext = new EmulatorRunContext(
        cliContext.flags.username as string,
        cliContext.flags.password as string,
        cliContext.flags.kibana as string,
        cliContext.flags.elastic as string,
        cliContext.flags.asSuperuser as boolean,
        cliContext.log
      );
      await emulatorContext.start();

      const actionDelay = Number(cliContext.flags.actionDelay) || 5_000;
      const checkinInterval = Number(cliContext.flags.checkinInterval) || 60_000; // Default: 1 minute

      const esClient = emulatorContext.getEsClient();
      const kbnClient = emulatorContext.getKbnClient();
      const log = emulatorContext.getLogger();

      const keepAliveService = new AgentKeepAliveService(esClient, kbnClient, log, checkinInterval);
      keepAliveService.start();

      const actionResponderService = new ActionResponderService(
        esClient,
        kbnClient,
        log,
        5_000, // Check for actions every 5s
        actionDelay
      );
      actionResponderService.start();

      // TODO:PT check if any endpoints are loaded - if not, then load 5 now

      // TODO:PT Show Main menu

      await Promise.all([keepAliveService.whileRunning, actionResponderService.whileRunning]);

      cliContext.log.write(`
${HORIZONTAL_LINE}
`);
    },

    // Options
    {
      description: `Endpoint agent emulator.`,
      flags: {
        string: ['kibana', 'elastic', 'username', 'password'],
        boolean: ['asSuperuser'],
        default: {
          kibana: 'http://localhost:5601',
          elastic: 'http://localhost:9200',
          username: 'elastic',
          password: 'changeme',
          asSuperuser: false,
          actionDelay: '',
        },
        help: `
        --username          User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
                            **IMPORTANT:** if 'asSuperuser' option is not used, then the
                            user defined here MUST have 'superuser' AND 'kibana_system' roles
        --password          User name Password (Default: changeme)
        --asSuperuser       If defined, then a Security super user will be created using the
                            the credentials defined via 'username' and 'password' options. This
                            new user will then be used to run this utility.
        --kibana            The url to Kibana (Default: http://localhost:5601)
        --elastic           The url to Elasticsearch (Default: http:localholst:9200)
        --checkinInterval   The interval between how often the Agent is checked into fleet and a
                            metadata document update is sent for the endpoint. Default is 1 minute
        --actionDelay       The delay (in milliseconds) that should be applied before responding
                            to an action. (Default: 5000 (5s))
      `,
      },
    }
  );
};
