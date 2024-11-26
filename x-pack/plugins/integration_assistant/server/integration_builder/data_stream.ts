/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nunjucks from 'nunjucks';
import { join as joinPath } from 'path';
import { load } from 'js-yaml';
import type { DataStream } from '../../common';
import { DEFAULT_CEL_PROGRAM } from './constants';
import { copySync, createSync, ensureDirSync, listDirSync, readSync } from '../util';
import { Field } from '../util/samples';

export function createDataStream(
  packageName: string,
  specificDataStreamDir: string,
  dataStream: DataStream
): Field[] {
  const dataStreamName = dataStream.name;
  const pipelineDir = joinPath(specificDataStreamDir, 'elasticsearch', 'ingest_pipeline');
  const title = dataStream.title;
  const description = dataStream.description;
  const samplesFormat = dataStream.samplesFormat;
  const useMultilineNDJSON = samplesFormat.name === 'ndjson' && samplesFormat.multiline === true;

  ensureDirSync(specificDataStreamDir);
  const fields = createDataStreamFolders(specificDataStreamDir, pipelineDir);
  createPipelineTests(specificDataStreamDir, dataStream.rawSamples, packageName, dataStreamName);

  const dataStreams: string[] = [];
  for (const inputType of dataStream.inputTypes) {
    let mappedValues = {
      data_stream_title: title,
      data_stream_description: description,
      package_name: packageName,
      data_stream_name: dataStreamName,
      multiline_ndjson: useMultilineNDJSON,
    } as object;

    if (inputType === 'cel') {
      if (dataStream.celInput != null) {
        // Map the generated CEL config items into the template
        const cel = dataStream.celInput;
        mappedValues = {
          ...mappedValues,
          // Ready the program for printing with correct indentation
          program: cel.program.split('\n'),
          state: cel.stateSettings,
          redact: cel.redactVars,
          auth: cel.authType,
          url: cel.url,
          showAll: false,
        };
      } else {
        mappedValues = {
          ...mappedValues,
          program: DEFAULT_CEL_PROGRAM.split('\n'),
          url: 'https://server.example.com:8089/api',
          showAll: true,
        };
      }
    }

    const dataStreamManifest = nunjucks.render(
      `${inputType.replaceAll('-', '_')}_manifest.yml.njk`,
      mappedValues
    );
    const commonManifest = nunjucks.render('common_manifest.yml.njk', mappedValues);

    const combinedManifest = `${dataStreamManifest}\n${commonManifest}`;
    dataStreams.push(combinedManifest);
  }

  const finalManifest = nunjucks.render('data_stream.yml.njk', {
    title,
    data_streams: dataStreams,
  });

  createSync(joinPath(specificDataStreamDir, 'manifest.yml'), finalManifest);

  return fields;
}

function createDataStreamFolders(specificDataStreamDir: string, pipelineDir: string): Field[] {
  ensureDirSync(pipelineDir);
  return copyFilesFromTemplateDir(specificDataStreamDir);
}

function copyFilesFromTemplateDir(specificDataStreamDir: string): Field[] {
  const dataStreamTemplatesDir = joinPath(__dirname, '../templates/data_stream');
  const items = listDirSync(dataStreamTemplatesDir);
  return items.flatMap((item) => {
    const sourcePath = joinPath(dataStreamTemplatesDir, item);
    const destinationPath = joinPath(specificDataStreamDir, item);
    copySync(sourcePath, destinationPath);
    const files = listDirSync(sourcePath);

    return loadFieldsFromFiles(sourcePath, files);
  });
}

function loadFieldsFromFiles(sourcePath: string, files: string[]): Field[] {
  return files.flatMap((file) => {
    const filePath = joinPath(sourcePath, file);
    const content = readSync(filePath);
    return load(content) as Field[];
  });
}

function createPipelineTests(
  specificDataStreamDir: string,
  rawSamples: string[],
  packageName: string,
  dataStreamName: string
): void {
  const pipelineTestTemplatesDir = joinPath(__dirname, '../templates/pipeline_tests');
  const pipelineTestsDir = joinPath(specificDataStreamDir, '_dev/test/pipeline');
  ensureDirSync(pipelineTestsDir);
  const items = listDirSync(pipelineTestTemplatesDir);
  for (const item of items) {
    const s = joinPath(pipelineTestTemplatesDir, item);
    const d = joinPath(pipelineTestsDir, item.replaceAll('_', '-'));
    copySync(s, d);
  }
  const formattedPackageName = packageName.replace(/_/g, '-');
  const formattedDataStreamName = dataStreamName.replace(/_/g, '-');
  const testFileName = joinPath(
    pipelineTestsDir,
    `test-${formattedPackageName}-${formattedDataStreamName}.log`
  );
  createSync(testFileName, rawSamples.join('\n'));
}
