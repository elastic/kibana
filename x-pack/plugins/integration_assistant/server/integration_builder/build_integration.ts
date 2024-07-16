/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import nunjucks from 'nunjucks';
import { tmpdir } from 'os';
import { join as joinPath } from 'path';
import type { DataStream, Integration } from '../../common';
import { createSync, ensureDirSync, generateUniqueId } from '../util';
import { createAgentInput } from './agent';
import { createDataStream } from './data_stream';
import { createFieldMapping } from './fields';
import { createPipeline } from './pipeline';

export async function buildPackage(integration: Integration): Promise<Buffer> {
  const templateDir = joinPath(__dirname, '../templates');
  const agentTemplates = joinPath(templateDir, 'agent');
  const manifestTemplates = joinPath(templateDir, 'manifest');
  const systemTestTemplates = joinPath(templateDir, 'system_tests');
  nunjucks.configure([templateDir, agentTemplates, manifestTemplates, systemTestTemplates], {
    autoescape: false,
  });

  const tmpDir = joinPath(tmpdir(), `integration-assistant-${generateUniqueId()}`);
  const packageDirectoryName = `${integration.name}-0.1.0`;
  const packageDir = createDirectories(tmpDir, integration, packageDirectoryName);
  const dataStreamsDir = joinPath(packageDir, 'data_stream');

  for (const dataStream of integration.dataStreams) {
    const dataStreamName = dataStream.name;
    const specificDataStreamDir = joinPath(dataStreamsDir, dataStreamName);

    createDataStream(integration.name, specificDataStreamDir, dataStream);
    createAgentInput(specificDataStreamDir, dataStream.inputTypes);
    createPipeline(specificDataStreamDir, dataStream.pipeline);
    createFieldMapping(integration.name, dataStreamName, specificDataStreamDir, dataStream.docs);
  }

  const zipBuffer = await createZipArchive(tmpDir, packageDirectoryName);
  return zipBuffer;
}

function createDirectories(
  tmpDir: string,
  integration: Integration,
  packageDirectoryName: string
): string {
  const packageDir = joinPath(tmpDir, packageDirectoryName);
  ensureDirSync(tmpDir);
  ensureDirSync(packageDir);
  createPackage(packageDir, integration);
  return packageDir;
}

function createPackage(packageDir: string, integration: Integration): void {
  createReadme(packageDir, integration);
  createChangelog(packageDir);
  createBuildFile(packageDir);
  createPackageManifest(packageDir, integration);
  //  Skipping creation of system tests temporarily for custom package generation
  //  createPackageSystemTests(packageDir, integration);
  if (integration?.logo !== undefined) {
    createLogo(packageDir, integration.logo);
  }
}

function createLogo(packageDir: string, logo: string): void {
  const logoDir = joinPath(packageDir, 'img');
  ensureDirSync(logoDir);

  const buffer = Buffer.from(logo, 'base64');
  createSync(joinPath(logoDir, 'logo.svg'), buffer);
}

function createBuildFile(packageDir: string): void {
  const buildFile = nunjucks.render('build.yml.njk', { ecs_version: '8.11.0' });
  const buildDir = joinPath(packageDir, '_dev/build');

  ensureDirSync(buildDir);
  createSync(joinPath(buildDir, 'build.yml'), buildFile);
}

function createChangelog(packageDir: string): void {
  const changelogTemplate = nunjucks.render('changelog.yml.njk', {
    initial_version: '0.1.0',
  });

  createSync(joinPath(packageDir, 'changelog.yml'), changelogTemplate);
}

function createReadme(packageDir: string, integration: Integration) {
  const readmeDirPath = joinPath(packageDir, '_dev/build/docs/');
  ensureDirSync(readmeDirPath);
  const readmeTemplate = nunjucks.render('package_readme.md.njk', {
    package_name: integration.name,
    data_streams: integration.dataStreams,
  });

  createSync(joinPath(readmeDirPath, 'README.md'), readmeTemplate);
}

async function createZipArchive(tmpDir: string, packageDirectoryName: string): Promise<Buffer> {
  const tmpPackageDir = joinPath(tmpDir, packageDirectoryName);
  const zip = new AdmZip();
  zip.addLocalFolder(tmpPackageDir, packageDirectoryName);
  const buffer = zip.toBuffer();
  return buffer;
}

function createPackageManifest(packageDir: string, integration: Integration): void {
  const uniqueInputs: { [key: string]: { type: string; title: string; description: string } } = {};

  integration.dataStreams.forEach((dataStream: DataStream) => {
    dataStream.inputTypes.forEach((inputType: string) => {
      if (!uniqueInputs[inputType]) {
        uniqueInputs[inputType] = {
          type: inputType,
          title: dataStream.title,
          description: dataStream.description,
        };
      }
    });
  });

  const uniqueInputsList = Object.values(uniqueInputs);

  const packageManifest = nunjucks.render('package_manifest.yml.njk', {
    format_version: '3.1.4',
    package_title: integration.title,
    package_name: integration.name,
    package_version: '0.1.0',
    package_description: integration.description,
    package_logo: integration.logo,
    package_owner: '@elastic/custom-integrations',
    min_version: '^8.13.0',
    inputs: uniqueInputsList,
  });

  createSync(joinPath(packageDir, 'manifest.yml'), packageManifest);
}
