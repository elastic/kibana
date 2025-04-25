/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nunjucks from 'nunjucks';
import { join as joinPath } from 'path';
import type { DataStream } from '../../common';
import { copySync, createSync, ensureDirSync, listDirSync } from '../util';

export function createDataStream(
  packageName: string,
  specificDataStreamDir: string,
  dataStream: DataStream
): void {
  const dataStreamName = dataStream.name;
  const pipelineDir = joinPath(specificDataStreamDir, 'elasticsearch', 'ingest_pipeline');
  const title = dataStream.title;
  const description = dataStream.description;
  const samplesFormat = dataStream.samplesFormat;
  const useMultilineNDJSON = samplesFormat.name === 'ndjson' && samplesFormat.multiline === true;

  ensureDirSync(specificDataStreamDir);
  createDataStreamFolders(specificDataStreamDir, pipelineDir);
  createPipelineTests(specificDataStreamDir, dataStream.rawSamples, packageName, dataStreamName);

  const dataStreams: string[] = [];
  for (const inputType of dataStream.inputTypes) {
    const mappedValues = {
      data_stream_title: title,
      data_stream_description: description,
      package_name: packageName,
      data_stream_name: dataStreamName,
      multiline_ndjson: useMultilineNDJSON,
    };
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
}

function createDataStreamFolders(specificDataStreamDir: string, pipelineDir: string): void {
  const dataStreamTemplatesDir = joinPath(__dirname, '../templates/data_stream');
  const items = listDirSync(dataStreamTemplatesDir);

  for (const item of items) {
    const s = joinPath(dataStreamTemplatesDir, item);
    const d = joinPath(specificDataStreamDir, item);
    copySync(s, d);
  }

  ensureDirSync(pipelineDir);
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
