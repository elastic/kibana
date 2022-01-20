/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs/promises';

const BUNDLED_PACKAGE_DIRECTORY = path.join(__dirname, '../../../bundled_packages');

interface BundledPackage {
  name: string;
  buffer: Buffer;
}

export async function getBundledPackages(): Promise<BundledPackage[]> {
  const dirContents = await fs.readdir(BUNDLED_PACKAGE_DIRECTORY);
  const zipFiles = dirContents.filter((file) => file.endsWith('.zip'));

  const result = await Promise.all(
    zipFiles.map(async (zipFile) => {
      const file = await fs.readFile(path.join(BUNDLED_PACKAGE_DIRECTORY, zipFile));

      return {
        name: zipFile.replace('.zip', ''),
        buffer: file,
      };
    })
  );

  return result;
}
