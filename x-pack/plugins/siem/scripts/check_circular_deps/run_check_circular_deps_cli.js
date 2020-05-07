/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

/* eslint-disable-next-line import/no-extraneous-dependencies */
import madge from 'madge';
/* eslint-disable-next-line import/no-extraneous-dependencies */
import { run, createFailError } from '@kbn/dev-utils';

run(
  async ({ log }) => {
    const result = await madge(
      [resolve(__dirname, '../../public'), resolve(__dirname, '../../common')],
      {
        fileExtensions: ['ts', 'js', 'tsx'],
        excludeRegExp: [
          'test.ts$',
          'test.tsx$',
          'containers/detection_engine/rules/types.ts$',
          'src/core/server/types.ts$',
          'src/core/server/saved_objects/types.ts$',
          'src/core/public/chrome/chrome_service.tsx$',
          'src/core/public/overlays/banners/banners_service.tsx$',
          'src/core/public/saved_objects/saved_objects_client.ts$',
          'src/plugins/data/public',
          'src/plugins/ui_actions/public',
        ],
      }
    );

    const circularFound = result.circular();
    if (circularFound.length !== 0) {
      throw createFailError(
        `SIEM circular dependencies of imports has been found:\n - ${circularFound.join('\n - ')}`
      );
    } else {
      log.success('No circular deps 👍');
    }
  },
  {
    description: 'Check the SIEM plugin for circular deps',
  }
);
