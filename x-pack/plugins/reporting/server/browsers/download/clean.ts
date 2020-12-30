/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import del from 'del';
import { readdirSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { GenericLevelLogger } from '../../lib/level_logger';
import { asyncMap } from './util';

/**
 * Delete any file in the `dir` that is not in the expectedPaths
 */
export async function clean(dir: string, expectedPaths: string[], logger: GenericLevelLogger) {
  let filenames: string[];
  try {
    filenames = await readdirSync(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // directory doesn't exist, that's as clean as it gets
      return;
    }

    throw error;
  }

  await asyncMap(filenames, async (filename) => {
    const path = resolvePath(dir, filename);
    if (!expectedPaths.includes(path)) {
      logger.warning(`Deleting unexpected file ${path}`);
      await del(path, { force: true });
    }
  });
}
