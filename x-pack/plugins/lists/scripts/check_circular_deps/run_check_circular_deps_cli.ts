/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

// @ts-ignore
import madge from 'madge';
import { createFailError, run } from '@kbn/dev-utils';

run(
  async ({ log }) => {
    const result = await madge(
      [resolve(__dirname, '../../public'), resolve(__dirname, '../../common')],
      {
        excludeRegExp: [
          'test.ts$',
          'test.tsx$',
          'src/core/server/types.ts$',
          'src/core/server/saved_objects/types.ts$',
          'src/core/public/chrome/chrome_service.tsx$',
          'src/core/public/overlays/banners/banners_service.tsx$',
          'src/core/public/saved_objects/saved_objects_client.ts$',
          'src/plugins/data/public',
          'src/plugins/ui_actions/public',
        ],
        fileExtensions: ['ts', 'js', 'tsx'],
      }
    );

    const circularFound = result.circular();
    if (circularFound.length !== 0) {
      throw createFailError(
        `Lists circular dependencies of imports has been found:\n - ${circularFound.join('\n - ')}`
      );
    } else {
      log.success('No circular deps 👍');
    }
  },
  {
    description: 'Check the Lists plugin for circular deps',
  }
);
