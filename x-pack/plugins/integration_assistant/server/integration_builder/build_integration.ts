/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyFileSync, writeFileSync, mkdirSync } from 'fs';
import { join as joinPath } from 'path';
import { tmpdir } from 'os';
import nunjucks from 'nunjucks';
import yaml from 'js-yaml';
import AdmZip from 'adm-zip';
import { Integration, DataStream } from '../../common';
import { ensureDir } from '../util/util';
import { createPackageManifest } from './manifest';
import { createPackageSystemTests } from './dev_folders';
import { createDatastream } from './data_stream';
import { createAgentInput } from './agent';
import { createFieldMapping } from './fields';
import { generateUniqueId } from '../util/util';

export function buildPackage(integration: Integration): File {
  const tmpDir = joinPath(tmpdir(), `integration-assistant-${generateUniqueId()}`);
  const packageDir = createDirectories(tmpDir, integration);
  const dataStreamsDir = joinPath(packageDir, 'data_stream');

  for (const dataStream of integration.dataStreams) {
    const dataStreamName = dataStream.name;
    const specificDataStreamDir = joinPath(dataStreamsDir, dataStreamName);

    createDatastream(integration.name, specificDataStreamDir, dataStream);
    createAgentInput(specificDataStreamDir, dataStream.inputTypes);
    createPipeline(specificDataStreamDir, dataStream.pipeline);
    createFieldMapping(integration.name, dataStreamName, specificDataStreamDir, dataStream.docs);
  }

  const packageTempPath = joinPath(
    tmpDir,
    tmpPackageDir,
    `${integration.name}-${integration.initialVersion}`
  );
  const zipBuffer = createZipArchive(tmpDir, tmpPackageDir);

  return zipBuffer;
}

function createDirectories(tmpDir: string, integration: Integration) {
  mkdirSync(tmpDir, { recursive: true });

  const packageDir = joinPath(tmpDir, `${integration.name}-${integration.initialVersion}`);

  mkdirSync(packageDir, { recursive: true });

  createPackage(packageDir, integration);

  return packageDir;
}

function createZipArchive(tmpDir: string, tmpPackageDir: string) {
  const zip = new AdmZip();
  const directoryPath = joinPath(tmpDir, tmpPackageDir);

  zip.addLocalFolder(directoryPath);

  return zip.toBuffer();
}

export function createPackage(packageDir: string, integration: Integration) {
  createReadme(packageDir, integration);
  createChangelog(packageDir, integration);
  createBuildFile(packageDir);
  createPackageManifest(packageDir, integration);
  createPackageSystemTests(packageDir, integration);
  createDefaultLogo(packageDir);
}

function createDefaultLogo(packageDir: string) {
  const logoDir = joinPath(packageDir, 'img');
  ensureDir(logoDir);

  const imgTemplateDir = joinPath(__dirname, '../templates/img');
  copyFileSync(joinPath(imgTemplateDir, 'logo.svg'), joinPath(logoDir, 'logo.svg'));
}

function createBuildFile(packageDir: string) {
  const buildTemplateDir = joinPath(__dirname, '../templates/build');

  nunjucks.configure(buildTemplateDir, { autoescape: true });
  const buildFile = nunjucks.render('build.yml.j2', { ecs_version: '8.11.0' });

  const buildDir = joinPath(packageDir, '_dev/build');
  ensureDir(buildDir);
  writeFileSync(joinPath(buildDir, 'build.yml'), buildFile, 'utf-8');
}

function createChangelog(packageDir: string, integration: Integration): void {
  const changelogTemplateDir = joinPath(__dirname, '../templates/img');
  nunjucks.configure(changelogTemplateDir, { autoescape: true });

  const changelogTemplate = nunjucks.render('changelog.yml.j2', {
    initial_version: integration.initialVersion,
  });

  writeFileSync(joinPath(packageDir, 'changelog.yml'), changelogTemplate, 'utf-8');
}

function createReadme(packageDir: string, integration: Integration) {
  const readmeDir = joinPath(packageDir, '_dev/build/docs/');
  mkdirSync(readmeDir, { recursive: true });

  const readmeTemplatesDir = joinPath(__dirname, '../templates/readme');
  nunjucks.configure(readmeTemplatesDir, { autoescape: true });

  const readmeTemplate = nunjucks.render('README.md.j2', {
    package_name: integration.name,
    data_streams: integration.dataStreams,
  });

  writeFileSync(joinPath(readmeDir, 'README.md'), readmeTemplate, { encoding: 'utf-8' });
}

export function createPipeline(specificDataStreamDir: string, pipeline: object) {
  const filePath = joinPath(specificDataStreamDir, 'elasticsearch/ingest_pipeline/default.yml');
  const yamlContent = '---\n' + yaml.dump(pipeline, { sortKeys: false });
  writeFileSync(filePath, yamlContent, 'utf-8');
}
