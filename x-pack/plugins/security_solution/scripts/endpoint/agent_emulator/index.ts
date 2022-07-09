/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, RunContext } from '@kbn/dev-cli-runner';
import { AgentKeepAliveService } from './keep_alive';
import { EmulatorRunContext } from './emulator_run_context';
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

      const keepAliveService = new AgentKeepAliveService(
        emulatorContext.getEsClient(),
        emulatorContext.getKbnClient(),
        emulatorContext.getLogger()
      );
      keepAliveService.start();

      await keepAliveService.whileRunning;

      cliContext.log.write(`
${HORIZONTAL_LINE}
`);
    },

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
        },
        help: `
        --username          User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
                            **IMPORTANT:** if 'asSuperuser' option is not used, then the
                            user defined here MUST have 'superuser' and 'kibana_system' roles
        --password          User name Password (Default: changeme)
        --asSuperuser       If defined, then a Security super user will be created using the
                            the credentials defined via 'username' and 'password' options. This
                            new user will then be used to run this utility.
        --kibana            The url to Kibana (Default: http://localhost:5601)
        --elastic           The url to Elasticsearch (Default: http:localholst:9200)
      `,
      },
    }
  );
};
