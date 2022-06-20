/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, RunContext } from '@kbn/dev-cli-runner';
import { HORIZONTAL_LINE, SUPPORTED_TOKENS } from './constants';
import { runInAutoMode } from './run_in_auto_mode';

export const cli = () => {
  run(
    async (context: RunContext) => {
      context.log.write(`
${HORIZONTAL_LINE}
 Endpoint Action Responder
${HORIZONTAL_LINE}
`);
      if (context.flags.mode === 'auto') {
        return runInAutoMode(context);
      }

      context.log.warning(`exiting... Nothing to do. use '--help' to see list of options`);

      context.log.write(`
${HORIZONTAL_LINE}
`);
    },

    {
      description: `Respond to pending Endpoint actions.
  ${SUPPORTED_TOKENS}`,
      flags: {
        string: ['mode', 'kibana', 'elastic', 'username', 'password', 'delay'],
        boolean: ['asSuperuser'],
        default: {
          mode: 'auto',
          kibana: 'http://localhost:5601',
          elastic: 'http://localhost:9200',
          username: 'elastic',
          password: 'changeme',
          asSuperuser: false,
          delay: '',
        },
        help: `
        --mode              The mode for running the tool. (Default: 'auto').
                            Value values are:
                            auto  : tool will continue to run and checking for pending
                                    actions periodically.
        --username          User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
                            **IMPORTANT:** This username's roles MUST have 'superuser']
                            and 'kibana_system' roles
        --password          User name Password (Default: changeme)
        --asSuperuser       If defined, then a Security super user will be created using the
                            the credentials defined via 'username' and 'password' options. This
                            new user will then be used to run this utility.
        --delay             The delay (in milliseconds) that should be applied before responding
                            to an action. (Default: 40000 (40s))
        --kibana            The url to Kibana (Default: http://localhost:5601)
        --elastic           The url to Elasticsearch (Default: http:localholst:9200)
      `,
      },
    }
  );
};
