/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import nunjucks from 'nunjucks';
import { DataStream } from '../../common';

function createDatastream(
  packageName: string,
  specificDataStreamDir: string,
  dataStream: DataStream
): void {
  nunjucks.configure({ autoescape: true });
  const dataStreamName = dataStream.name;
  const manifestTemplatesDir = path.join(__dirname, '../templates/manifest');
  const pipelineDir = path.join(specificDataStreamDir, 'elasticsearch', 'ingest_pipeline');
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(manifestTemplatesDir));
  const title = dataStream.title;
  const description = dataStream.description;

  fs.mkdirSync(specificDataStreamDir, { recursive: true });
  createDataStreamFolders(specificDataStreamDir, pipelineDir);
  createPipelineTests(specificDataStreamDir, dataStream.rawSamples, packageName, dataStreamName);

  const dsStreams: string[] = [];
  for (const inputType of dataStream.inputTypes) {
    // Skip httpjson and cel input types for now, requires new prompts.
    const inputEntryTemplate = env.getTemplate(`${inputType}_manifest.yml.j2`);
    const mappedValues = {
      data_stream_title: title,
      data_stream_description: description,
      package_name: packageName,
      data_stream_name: dataStreamName,
    };
    const dataStreamManifest = inputEntryTemplate.render(mappedValues);

    const commonTemplate = env.getTemplate('common.yml.j2');
    const commonManifest = commonTemplate.render(mappedValues);

    const combinedManifest = `${dataStreamManifest}\n${commonManifest}`;
    dsStreams.push(combinedManifest);
    createDataStreamSystemTests(
      specificDataStreamDir,
      inputType,
      mappedValues,
      packageName,
      dataStreamName
    );
  }

  const finalManifestTemplate = env.getTemplate('data_stream.yml.j2');
  const finalManifest = finalManifestTemplate.render({ title, data_streams: dsStreams });

  fs.writeFileSync(path.join(specificDataStreamDir, 'manifest.yml'), finalManifest, 'utf-8');
}

function createDataStreamFolders(specificDataStreamDir: string, pipelineDir: string): void {
  const dataStreamTemplatesDir = path.join(__dirname, '../templates/data_stream');
  for (const item of fs.readdirSync(dataStreamTemplatesDir)) {
    const s = path.join(dataStreamTemplatesDir, item);
    const d = path.join(specificDataStreamDir, item);
    if (fs.lstatSync(s).isDirectory()) {
      fs.cpSync(s, d, { recursive: true });
    } else {
      fs.copyFileSync(s, d);
    }
  }
  fs.mkdirSync(pipelineDir, { recursive: true });
}

function createPipelineTests(
  specificDataStreamDir: string,
  rawSamples: string[],
  packageName: string,
  dataStreamName: string
): void {
  const pipelineTestTemplatesDir = path.join(__dirname, '../templates/pipeline_tests');
  const pipelineTestsDir = path.join(specificDataStreamDir, '_dev/test/pipeline');
  fs.mkdirSync(pipelineTestsDir, { recursive: true });
  for (const item of fs.readdirSync(pipelineTestTemplatesDir)) {
    const s = path.join(pipelineTestTemplatesDir, item);
    const d = path.join(pipelineTestsDir, item);
    if (fs.lstatSync(s).isDirectory()) {
      fs.cpSync(s, d, { recursive: true });
    } else {
      fs.copyFileSync(s, d);
    }
  }
  const formattedPackageName = packageName.replace(/_/g, '-');
  const formattedDataStreamName = dataStreamName.replace(/_/g, '-');
  const testFileName = path.join(
    pipelineTestsDir,
    `test-${formattedPackageName}-${formattedDataStreamName}.log`
  );
  fs.writeFileSync(testFileName, rawSamples.join('\n'), 'utf-8');
}

function createDataStreamSystemTests(
  specificDataStreamDir: string,
  inputType: string,
  mappedValues: Record<string, string>,
  packageName: string,
  dataStreamName: string
): void {
  const systemTestTemplatesDir = path.join(__dirname, '../templates/system_tests');
  nunjucks.configure({ autoescape: true });
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(systemTestTemplatesDir));
  mappedValues.package_name = packageName.replace(/_/g, '-');
  mappedValues.data_stream_name = dataStreamName.replace(/_/g, '-');
  const systemTestFolder = path.join(specificDataStreamDir, '_dev/test/system');

  fs.mkdirSync(systemTestFolder, { recursive: true });

  const systemTestTemplate = env.getTemplate(`test-${inputType}-config.yml.j2`);
  const systemTestRendered = systemTestTemplate.render(mappedValues);

  const systemTestFileName = path.join(systemTestFolder, `test-${inputType}-config.yml`);
  fs.writeFileSync(systemTestFileName, systemTestRendered, 'utf-8');
}

export {
  createDatastream,
  createDataStreamFolders,
  createPipelineTests,
  createDataStreamSystemTests,
};
