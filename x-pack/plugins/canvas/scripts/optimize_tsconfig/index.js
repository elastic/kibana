/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable import/no-extraneous-dependencies */

const { run } = require('@kbn/dev-utils');
const { optimizeTsConfig } = require('./optimize');
const { deoptimizeTsConfig } = require('./deoptimize');

run(
  ({ log, flags }) => {
    const { revert } = flags;

    if (revert) {
      deoptimizeTsConfig()
        .catch((err) => {
          log.error(err);
          // eslint-disable-next-line no-process-exit
          process.exit(1);
        })
        .finally(() => {
          log.info('Reverted Canvas TypeScript optimization changes.');
        });
    } else {
      optimizeTsConfig()
        .catch((err) => {
          console.error(err);
          // eslint-disable-next-line no-process-exit
          process.exit(1);
        })
        .finally(() => {
          log.info(
            'Optimized tsconfig.json file(s) in Kibana for Canvas development. To undo these changes, run `./scripts/optimize_tsconfig --revert`'
          );
        });
    }
  },
  {
    description: `
      Typescript Configuration Optimizer for Canvas.  Changes will not be registered in git.  
      
      When in doubt, --revert.
    `,
    flags: {
      boolean: ['revert'],
      help: `
        --revert           Revert the optimizations in the Typescript configurations.
      `,
    },
  }
);
