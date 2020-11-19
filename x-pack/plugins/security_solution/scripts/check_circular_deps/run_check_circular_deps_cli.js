/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable-next-line import/no-extraneous-dependencies */
import madge from 'madge';
/* eslint-disable-next-line import/no-extraneous-dependencies */
import { run, createFailError } from '@kbn/dev-utils';
import * as os from 'os';
import * as path from 'path';

run(
  async ({ log, flags }) => {
    const result = await madge(
      [path.resolve(__dirname, '../../public'), path.resolve(__dirname, '../../common')],
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
      if (flags.svg) {
        await outputSVGs(circularFound);
      } else {
        console.log(
          'Run this program with the --svg flag to save an SVG showing the dependency graph.'
        );
      }
      throw createFailError(
        `SIEM circular dependencies of imports has been found:\n - ${circularFound.join('\n - ')}`
      );
    } else {
      log.success('No circular deps 👍');
    }
  },
  {
    description:
      'Check the Security Solution plugin for circular deps. If any are found, this will throw an Error.',
    flags: {
      help: '  --svg,             Output SVGs of circular dependency graphs',
      boolean: ['svg'],
      default: {
        svg: false,
      },
    },
  }
);

async function outputSVGs(circularFound) {
  let count = 0;
  for (const found of circularFound) {
    // Calculate the path using the os tmpdir and an increasing 'count'
    const expectedImagePath = path.join(os.tmpdir(), `security_solution-circular-dep-${count}.svg`);
    console.log(`Attempting to save SVG for circular dependency: ${found}`);
    count++;

    // Graph just the files in the found circular dependency.
    const specificGraph = await madge(found, {
      fileExtensions: ['ts', 'js', 'tsx'],
    });

    // Output an SVG in the tmp directory
    const imagePath = await specificGraph.image(expectedImagePath);

    console.log(`Saved SVG: ${imagePath}`);
  }
}
