/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, RunContext } from '@kbn/dev-cli-runner';
import { HORIZONTAL_LINE } from './constants';
import { runInAutoMode } from './run_in_auto_mode';
export const ONE = 'test';

export const cli = () => {
  run(
    async (context: RunContext) => {
      context.log.write(`
${HORIZONTAL_LINE}
 Endpoint Action Responder
${HORIZONTAL_LINE}
`);

      if (context.flags.auto) {
        return runInAutoMode(context);
      }

      context.log.warning(`exiting... Nothing to do. use '--help' to see list of options`);

      context.log.write(`
${HORIZONTAL_LINE}
`);
    },

    {
      description: 'Respond to pending Endpoint actions',
      flags: {
        string: ['kibana', 'elastic', 'username', 'password'],
        boolean: ['auto'],
        default: {
          kibana: 'http://localhost:5601',
          elastic: 'http://localhost:9200',
          username: 'elastic',
          password: 'changeme',
        },
        help: `
        --auto              If used, tool will run in auto mode, checking for pending
                            actions periodically and auto responding to them.
        --username          User ID (Default: elastic)
        --password          User ID Password (Default: changeme)
        --kibana            The url to Kibana (Default: http://localhost:5601)
        --elastic           The url to Elasticsearch (Default: http:localholst:9200)
      `,
      },
    }
  );
};
