/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import del from 'del';
import { readdirSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { LevelLogger } from '../../lib';
import { asyncMap } from './util';

/**
 * Delete any file in the `dir` that is not in the expectedPaths
 */
export async function clean(dir: string, expectedPaths: string[], logger: LevelLogger) {
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
      logger.warn(`Deleting unexpected file ${path}`);
      await del(path, { force: true });
    }
  });
}
