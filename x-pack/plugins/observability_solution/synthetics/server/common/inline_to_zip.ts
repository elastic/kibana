/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import archiver from 'archiver';
import { MemWritable } from './mem_writable';

function wrapInlineInProject(inlineJourney: string) {
  return `import { journey, step, expect } from '@elastic/synthetics';

journey('inline', ({ page, context, browser, params, request }) => {
${inlineJourney}
});`;
}

export async function inlineToProjectZip(
  inlineJourney: string,
  monitorId: string,
  logger: Logger
): Promise<string> {
  const mWriter = new MemWritable();
  try {
    await new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });
      archive.on('error', reject);
      mWriter.on('close', resolve);
      archive.pipe(mWriter);
      archive.append(wrapInlineInProject(inlineJourney), {
        name: 'inline.journey.ts',
      });
      archive.finalize();
    });
  } catch (e) {
    logger.error(`Failed to create zip for inline monitor ${monitorId}`);
    throw e;
  }
  return mWriter.buffer.toString('base64');
}
