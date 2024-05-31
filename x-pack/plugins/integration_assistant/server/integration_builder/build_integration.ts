/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join as joinPath } from 'path';
import { tmpdir } from 'os';
import nunjucks from 'nunjucks';
import AdmZip from 'adm-zip';
import { Integration, DataStream } from '../../common';
import { createPackageSystemTests } from './dev_folders';
import { createDatastream } from './data_stream';
import { createAgentInput } from './agent';
import { createFieldMapping } from './fields';
import { createPipeline } from './pipeline';
import { generateUniqueId, asyncEnsureDir, asyncCopy, asyncCreate } from '../util';

export async function buildPackage(integration: Integration): Promise<Buffer> {
  const templateDir = joinPath(__dirname, '../templates');
  const agentTemplates = joinPath(templateDir, 'agent');
  const manifestTemplates = joinPath(templateDir, 'manifest');
  const systemTestTemplates = joinPath(templateDir, 'system_tests');
  nunjucks.configure([templateDir, agentTemplates, manifestTemplates, systemTestTemplates], {
    autoescape: false,
  });

  const tmpDir = joinPath(tmpdir(), `integration-assistant-${generateUniqueId()}`);
  const packageDir = await createDirectories(tmpDir, integration);
  const dataStreamsDir = joinPath(packageDir, 'data_stream');

  for (const dataStream of integration.dataStreams) {
    const dataStreamName = dataStream.name;
    const specificDataStreamDir = joinPath(dataStreamsDir, dataStreamName);

    await createDatastream(integration.name, specificDataStreamDir, dataStream);
    await createAgentInput(specificDataStreamDir, dataStream.inputTypes);
    await createPipeline(specificDataStreamDir, dataStream.pipeline);
    await createFieldMapping(
      integration.name,
      dataStreamName,
      specificDataStreamDir,
      dataStream.docs
    );
  }

  const tmpPackageDir = joinPath(tmpDir, `${integration.name}-0.1.0`);

  const zipBuffer = await createZipArchive(tmpPackageDir);
  return zipBuffer;
}

async function createDirectories(tmpDir: string, integration: Integration): Promise<string> {
  const packageDir = joinPath(tmpDir, `${integration.name}-0.1.0`);
  await asyncEnsureDir(tmpDir);
  await asyncEnsureDir(packageDir);
  await createPackage(packageDir, integration);
  return packageDir;
}

async function createPackage(packageDir: string, integration: Integration): Promise<void> {
  await createReadme(packageDir, integration);
  await createChangelog(packageDir, integration);
  await createBuildFile(packageDir);
  await createPackageManifest(packageDir, integration);
  await createPackageSystemTests(packageDir, integration);
  await createLogo(packageDir, integration);
}

async function createLogo(packageDir: string, integration: Integration): Promise<void> {
  const logoDir = joinPath(packageDir, 'img');
  await asyncEnsureDir(logoDir);

  if (integration?.logo !== undefined) {
    const buffer = Buffer.from(integration.logo, 'base64');
    await asyncCreate(joinPath(logoDir, 'logo.svg'), buffer);
  } else {
    const imgTemplateDir = joinPath(__dirname, '../templates/img');
    await asyncCopy(joinPath(imgTemplateDir, 'logo.svg'), joinPath(logoDir, 'logo.svg'));
  }
}

async function createBuildFile(packageDir: string): Promise<void> {
  const buildFile = nunjucks.render('build.yml.njk', { ecs_version: '8.11.0' });
  const buildDir = joinPath(packageDir, '_dev/build');

  await asyncEnsureDir(buildDir);
  await asyncCreate(joinPath(buildDir, 'build.yml'), buildFile);
}

async function createChangelog(packageDir: string, integration: Integration): Promise<void> {
  const changelogTemplate = nunjucks.render('changelog.yml.njk', {
    initial_version: '0.1.0',
  });

  await asyncCreate(joinPath(packageDir, 'changelog.yml'), changelogTemplate);
}

async function createReadme(packageDir: string, integration: Integration) {
  const readmeDirPath = joinPath(packageDir, '_dev/build/docs/');
  await asyncEnsureDir(readmeDirPath);
  const readmeTemplate = nunjucks.render('README.md.njk', {
    package_name: integration.name,
    data_streams: integration.dataStreams,
  });

  await asyncCreate(joinPath(readmeDirPath, 'README.md'), readmeTemplate);
}

async function createZipArchive(tmpPackageDir: string): Promise<Buffer> {
  const zip = new AdmZip();
  zip.addLocalFolder(tmpPackageDir);
  return zip.toBuffer();
}

async function createPackageManifest(packageDir: string, integration: Integration): Promise<void> {
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
    package_owner: integration.owner,
    min_version: integration.minKibanaVersion,
    inputs: uniqueInputsList,
  });

  await asyncCreate(joinPath(packageDir, 'manifest.yml'), packageManifest);
}
