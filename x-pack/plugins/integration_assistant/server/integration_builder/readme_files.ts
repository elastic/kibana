/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nunjucks from 'nunjucks';

import { join as joinPath } from 'path';
import { createSync, ensureDirSync } from '../util';

export function createReadme(packageDir: string, integrationName: string, fields: object[]) {
  createPackageReadme(packageDir, integrationName, fields);
  createBuildReadme(packageDir, integrationName, fields);
}

function createPackageReadme(packageDir: string, integrationName: string, fields: object[]) {
  const dirPath = joinPath(packageDir, 'docs/');
  createReadmeFile(dirPath, 'package_readme.md.njk', integrationName, fields);
}

function createBuildReadme(packageDir: string, integrationName: string, fields: object[]) {
  const dirPath = joinPath(packageDir, '_dev/build/docs/');
  createReadmeFile(dirPath, 'build_readme.md.njk', integrationName, fields);
}

function createReadmeFile(
  targetDir: string,
  templateName: string,
  integrationName: string,
  fields: object[]
) {
  ensureDirSync(targetDir);

  const template = nunjucks.render(templateName, {
    package_name: integrationName,
    fields,
  });

  createSync(joinPath(targetDir, 'README.md'), template);
}
