/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import nunjucks from 'nunjucks';
import { getDataPath } from '@kbn/utils';
import { join as joinPath } from 'path';
import { safeDump } from 'js-yaml';
import type { DataStream, Integration } from '../../common';
import { createSync, ensureDirSync, generateUniqueId, removeDirSync } from '../util';
import { createAgentInput } from './agent';
import { createDataStream } from './data_stream';
import { createFieldMapping } from './fields';
import { createPipeline } from './pipeline';

import { createReadme } from './readme';

const initialVersion = '1.0.0';

function configureNunjucks() {
  const templateDir = joinPath(__dirname, '../templates');
  const agentTemplates = joinPath(templateDir, 'agent');
  const manifestTemplates = joinPath(templateDir, 'manifest');
  const systemTestTemplates = joinPath(templateDir, 'system_tests');
  nunjucks.configure([templateDir, agentTemplates, manifestTemplates, systemTestTemplates], {
    autoescape: false,
  });
}

export async function buildPackage(integration: Integration): Promise<Buffer> {
  configureNunjucks();

  const workingDir = joinPath(getDataPath(), `integration-assistant-${generateUniqueId()}`);
  const packageDirectoryName = `${integration.name}-${initialVersion}`;
  const packageDir = createDirectories(workingDir, integration, packageDirectoryName);

  const dataStreamsDir = joinPath(packageDir, 'data_stream');
  const dataStreamFields: object[] = [];

  for (const dataStream of integration.dataStreams) {
    const dataStreamName = dataStream.name;
    const specificDataStreamDir = joinPath(dataStreamsDir, dataStreamName);

    createDataStream(integration.name, specificDataStreamDir, dataStream);
    createAgentInput(specificDataStreamDir, dataStream.inputTypes);
    createPipeline(specificDataStreamDir, dataStream.pipeline);
    const fields = createFieldMapping(
      integration.name,
      dataStreamName,
      specificDataStreamDir,
      dataStream.docs
    );
    dataStreamFields.push({
      datastream: dataStreamName,
      fields,
    });
  }
  createReadme(packageDir, integration.name, dataStreamFields);
  const zipBuffer = await createZipArchive(workingDir, packageDirectoryName);

  removeDirSync(workingDir);
  return zipBuffer;
}

function createDirectories(
  workingDir: string,
  integration: Integration,
  packageDirectoryName: string
): string {
  const packageDir = joinPath(workingDir, packageDirectoryName);
  ensureDirSync(workingDir);
  ensureDirSync(packageDir);
  createPackage(packageDir, integration);
  return packageDir;
}

function createPackage(packageDir: string, integration: Integration): void {
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
    initial_version: initialVersion,
  });

  createSync(joinPath(packageDir, 'changelog.yml'), changelogTemplate);
}

async function createZipArchive(workingDir: string, packageDirectoryName: string): Promise<Buffer> {
  const tmpPackageDir = joinPath(workingDir, packageDirectoryName);
  const zip = new AdmZip();
  zip.addLocalFolder(tmpPackageDir, packageDirectoryName);
  const buffer = zip.toBuffer();
  return buffer;
}

/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Creates a package manifest dictionary.
 *
 * @param format_version - The format version of the package.
 * @param package_title - The title of the package.
 * @param package_name - The name of the package.
 * @param package_version - The version of the package.
 * @param package_description - The description of the package.
 * @param package_logo - The package logo file name, if present.
 * @param package_owner - The owner of the package.
 * @param min_version - The minimum version of Kibana required for the package.
 * @param inputs - An array of unique input objects containing type, title, and description.
 * @returns The package manifest dictionary.
 */
function createPackageManifestDict(
  format_version: string,
  package_title: string,
  package_name: string,
  package_version: string,
  package_description: string,
  package_logo: string | undefined,
  package_owner: string,
  min_version: string,
  inputs: Array<{ type: string; title: string; description: string }>
): { [key: string]: string | object } {
  const data: { [key: string]: string | object } = {
    format_version,
    name: package_name,
    title: package_title,
    version: package_version,
    description: package_description,
    type: 'integration',
    categories: ['security', 'iam'],
    conditions: {
      kibana: {
        version: min_version,
      },
    },
    policy_templates: [
      {
        name: package_name,
        title: package_title,
        description: package_description,
        inputs: inputs.map((input) => ({
          type: input.type,
          title: `${input.title} : ${input.type}`,
          description: input.description,
        })),
      },
    ],
    owner: {
      github: package_owner,
      type: 'community',
    },
  };

  if (package_logo !== undefined && package_logo !== '') {
    data.icons = {
      src: '/img/logo.svg',
      title: `${package_title} Logo`,
      size: '32x32',
      type: 'image/svg+xml',
    };
  }
  return data;
}
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Render the package manifest for an integration.
 *
 * @param integration - The integration object.
 * @returns The package manifest YAML rendered into a string.
 */
export function renderPackageManifestYAML(integration: Integration): string {
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

  const packageData = createPackageManifestDict(
    '3.1.4', // format_version
    integration.title, // package_title
    integration.name, // package_name
    initialVersion, // package_version
    integration.description, // package_description
    integration.logo, // package_logo
    '@elastic/custom-integrations', // package_owner
    '^8.13.0', // min_version
    uniqueInputsList // inputs
  );

  return safeDump(packageData);
}

function createPackageManifest(packageDir: string, integration: Integration): void {
  const packageManifest = renderPackageManifestYAML(integration);
  createSync(joinPath(packageDir, 'manifest.yml'), packageManifest);
}
