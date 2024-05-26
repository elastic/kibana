/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join as joinPath } from 'path';
import nunjucks from 'nunjucks';
import { DataStream } from '../../common';
import { asyncCopy, asyncEnsureDir, asyncCreate, asyncListDir } from '../util';

export async function createDatastream(
  packageName: string,
  specificDataStreamDir: string,
  dataStream: DataStream
): Promise<void> {
  const dataStreamName = dataStream.name;
  const pipelineDir = joinPath(specificDataStreamDir, 'elasticsearch', 'ingest_pipeline');
  const title = dataStream.title;
  const description = dataStream.description;

  await asyncEnsureDir(specificDataStreamDir);
  await createDataStreamFolders(specificDataStreamDir, pipelineDir);
  await createPipelineTests(
    specificDataStreamDir,
    dataStream.rawSamples,
    packageName,
    dataStreamName
  );

  const dataStreams: string[] = [];
  for (const inputType of dataStream.inputTypes) {
    const mappedValues = {
      data_stream_title: title,
      data_stream_description: description,
      package_name: packageName,
      data_stream_name: dataStreamName,
    };
    const dataStreamManifest = nunjucks.render(`${inputType}_manifest.yml.njk`, mappedValues);
    const commonManifest = nunjucks.render('common_manifest.yml.njk', mappedValues);

    const combinedManifest = `${dataStreamManifest}\n${commonManifest}`;
    dataStreams.push(combinedManifest);

    // We comment this out for now, as its not really needed for custom integrations
    /* createDataStreamSystemTests(
      specificDataStreamDir,
      inputType,
      mappedValues,
      packageName,
      dataStreamName
    );
    */
  }

  const finalManifest = nunjucks.render('data_stream.yml.njk', {
    title,
    data_streams: dataStreams,
  });

  await asyncCreate(joinPath(specificDataStreamDir, 'manifest.yml'), finalManifest);
}

async function createDataStreamFolders(
  specificDataStreamDir: string,
  pipelineDir: string
): Promise<void> {
  const dataStreamTemplatesDir = joinPath(__dirname, '../templates/data_stream');
  try {
    const items = await asyncListDir(dataStreamTemplatesDir);

    for (const item of items) {
      const s = joinPath(dataStreamTemplatesDir, item);
      const d = joinPath(specificDataStreamDir, item);
      await asyncCopy(s, d);
    }

    await asyncEnsureDir(pipelineDir);
  } catch (error) {
    throw error;
  }
}

async function createPipelineTests(
  specificDataStreamDir: string,
  rawSamples: string[],
  packageName: string,
  dataStreamName: string
): Promise<void> {
  const pipelineTestTemplatesDir = joinPath(__dirname, '../templates/pipeline_tests');
  const pipelineTestsDir = joinPath(specificDataStreamDir, '_dev/test/pipeline');
  await asyncEnsureDir(pipelineTestsDir);
  const items = await asyncListDir(pipelineTestTemplatesDir);
  for (const item of items) {
    const s = joinPath(pipelineTestTemplatesDir, item);
    const d = joinPath(pipelineTestsDir, item);
    await asyncCopy(s, d);
  }
  const formattedPackageName = packageName.replace(/_/g, '-');
  const formattedDataStreamName = dataStreamName.replace(/_/g, '-');
  const testFileName = joinPath(
    pipelineTestsDir,
    `test-${formattedPackageName}-${formattedDataStreamName}.log`
  );
  await asyncCreate(testFileName, rawSamples.join('\n'));
}

// We are skipping this one for now, as its not really needed for custom integrations
/* function createDataStreamSystemTests(
  specificDataStreamDir: string,
  inputType: string,
  mappedValues: Record<string, string>,
  packageName: string,
  dataStreamName: string
): void {
  const systemTestTemplatesDir = joinPath(__dirname, '../templates/system_tests');
  nunjucks.configure({ autoescape: true });
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(systemTestTemplatesDir));
  mappedValues.package_name = packageName.replace(/_/g, '-');
  mappedValues.data_stream_name = dataStreamName.replace(/_/g, '-');
  const systemTestFolder = joinPath(specificDataStreamDir, '_dev/test/system');

  fs.mkdirSync(systemTestFolder, { recursive: true });

  const systemTestTemplate = env.getTemplate(`test-${inputType}-config.yml.njk`);
  const systemTestRendered = systemTestTemplate.render(mappedValues);

  const systemTestFileName = joinPath(systemTestFolder, `test-${inputType}-config.yml`);
  fs.writeFileSync(systemTestFileName, systemTestRendered, 'utf-8');
}*/
