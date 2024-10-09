/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Environment, FileSystemLoader } from 'nunjucks';

import { join as joinPath } from 'path';
import { createSync, ensureDirSync } from '../util';

export function createReadme(packageDir: string, integrationName: string, fields: object[]) {
  try {
    createPackageReadme(packageDir, integrationName, fields);
    createBuildReadme(packageDir, integrationName, fields);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('********************************');
    // eslint-disable-next-line no-console
    console.log(e);
  }
}

function createPackageReadme(packageDir: string, integrationName: string, fields: object[]) {
  const dirPath = joinPath(packageDir, 'docs/');
  createReadmeFile(dirPath, 'package_rdm.md.njk', integrationName, fields);
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

  const templatesPath = joinPath(__dirname, '../templates');
  const env = new Environment(new FileSystemLoader(templatesPath), {
    autoescape: false,
  });

  const template = env.getTemplate(templateName);

  const renderedTemplate = template.render({
    package_name: integrationName,
    fields,
  });

  createSync(joinPath(targetDir, 'README.md'), renderedTemplate);
}
