/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Ensures that the target directory exists and removes any *.gen.ts files from it.
 *
 * @param folderPath target directory
 */
export async function ensureCleanFolder(folderPath: string) {
  try {
    await fs.access(folderPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(folderPath, { recursive: true });
    } else {
      throw err;
    }
  }

  const files = await fs.readdir(folderPath, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(folderPath, file.name);
    if (file.isDirectory()) {
      await ensureCleanFolder(fullPath);
    } else if (file.name.endsWith('.gen.ts')) {
      await fs.unlink(fullPath);
    }
  }
}
