/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import globby from 'globby';
import { resolve } from 'path';

/**
 * Removes any *.gen.ts files from the target directory
 *
 * @param folderPath target directory
 */
export async function removeGenArtifacts(folderPath: string) {
  const artifactsPath = await globby([resolve(folderPath, './**/*.gen.ts')]);

  await Promise.all(artifactsPath.map((artifactPath) => fs.unlink(artifactPath)));
}
