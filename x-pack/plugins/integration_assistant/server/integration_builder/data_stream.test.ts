/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Utils from '../util';
import { DataStream, Docs, InputType, Pipeline } from '../../common';
import { createDataStream } from './data_stream';
import * as nunjucks from 'nunjucks';

jest.mock('nunjucks');

jest.mock('../util', () => ({
  ...jest.requireActual('../util'),
  removeDirSync: jest.fn(),
  ensureDirSync: jest.fn(),
  createSync: jest.fn(),
  copySync: jest.fn(),
  generateUniqueId: jest.fn(),
  generateFields: jest.fn(),
}));

describe('createDataStream', () => {
  const packageName = 'package';
  const dataStreamPath = 'path';
  const firstDatastreamName = 'datastream_1';
  const firstDataStreamInputTypes: InputType[] = ['filestream', 'azure-eventhub'];
  const firstDataStreamDocs: Docs = [
    {
      key: 'foo',
      anotherKey: 'bar',
    },
  ];
  const firstDataStreamPipeline: Pipeline = {
    processors: [
      {
        set: {
          field: 'ecs.version',
          value: '8.11.0',
        },
      },
    ],
  };
  const samples = '{"test1": "test1"}';
  const firstDataStream: DataStream = {
    name: firstDatastreamName,
    title: 'Datastream_1',
    description: 'Datastream_1 description',
    inputTypes: firstDataStreamInputTypes,
    docs: firstDataStreamDocs,
    rawSamples: [samples],
    pipeline: firstDataStreamPipeline,
    samplesFormat: { name: 'ndjson', multiline: false },
  };

  it('Should create expected directories and files', async () => {
    createDataStream(packageName, dataStreamPath, firstDataStream);

    // pipeline
    expect(Utils.ensureDirSync).toHaveBeenCalledWith(dataStreamPath);
    expect(Utils.ensureDirSync).toHaveBeenCalledWith(
      `${dataStreamPath}/elasticsearch/ingest_pipeline`
    );

    // dataStream files
    expect(Utils.copySync).toHaveBeenCalledWith(expect.any(String), `${dataStreamPath}/fields`);

    // test files
    expect(Utils.ensureDirSync).toHaveBeenCalledWith(`${dataStreamPath}/_dev/test/pipeline`);
    expect(Utils.copySync).toHaveBeenCalledWith(
      expect.any(String),
      `${dataStreamPath}/_dev/test/pipeline/test-common-config.yml`
    );
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/_dev/test/pipeline/test-${packageName}-datastream-1.log`,
      samples
    );

    // // Manifest files
    expect(Utils.createSync).toHaveBeenCalledWith(`${dataStreamPath}/manifest.yml`, undefined);
    expect(nunjucks.render).toHaveBeenCalledWith(`filestream_manifest.yml.njk`, expect.anything());
    expect(nunjucks.render).toHaveBeenCalledWith(
      `azure_eventhub_manifest.yml.njk`,
      expect.anything()
    );
  });
});
