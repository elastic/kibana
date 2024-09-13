/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildIntegrationModule from './build_integration';
import { testIntegration } from '../../__jest__/fixtures/build_integration';
import * as Utils from '../util';
import * as DataStreamModule from './data_stream';
import * as FieldsModule from './fields';
import * as AgentModule from './agent';
import * as PipelineModule from './pipeline';
import { DataStream, Docs, InputType, Pipeline } from '../../common';
import nunjucks from 'nunjucks';

const mockedDataPath = 'path';
const mockedId = 123;

jest.mock('../util');
jest.mock('./data_stream');
jest.mock('./fields');
jest.mock('./agent');
jest.mock('./pipeline');

(Utils.generateUniqueId as jest.Mock).mockReturnValue(mockedId);

jest.mock('@kbn/utils', () => ({
  getDataPath: jest.fn(() => mockedDataPath),
}));

jest.mock('adm-zip', () => {
  return jest.fn().mockImplementation(() => ({
    addLocalFolder: jest.fn(),
    toBuffer: jest.fn(),
  }));
});

describe('buildPackage', () => {
  const packagePath = `${mockedDataPath}/integration-assistant-${mockedId}`;
  const integrationPath = `${packagePath}/integration-1.0.0`;

  const firstDatastreamName = 'datastream_1';
  const secondDatastreamName = 'datastream_2';

  const firstDataStreamInputTypes: InputType[] = ['filestream', 'kafka'];
  const secondDataStreamInputTypes: InputType[] = ['kafka'];

  const firstDataStreamDocs: Docs = [
    {
      key: 'foo',
      anotherKey: 'bar',
    },
  ];
  const secondDataStreamDocs: Docs = [{}];

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
  const secondDataStreamPipeline: Pipeline = { processors: [] };

  const firstDataStream: DataStream = {
    name: firstDatastreamName,
    title: 'Datastream_1',
    description: 'Datastream_1 description',
    inputTypes: firstDataStreamInputTypes,
    docs: firstDataStreamDocs,
    rawSamples: ['{"test1": "test1"}'],
    pipeline: firstDataStreamPipeline,
    samplesFormat: { name: 'ndjson', multiline: false },
  };

  const secondDataStream: DataStream = {
    name: secondDatastreamName,
    title: 'Datastream_2',
    description: 'Datastream_2 description',
    inputTypes: secondDataStreamInputTypes,
    docs: secondDataStreamDocs,
    rawSamples: ['{"test1": "test1"}'],
    pipeline: secondDataStreamPipeline,
    samplesFormat: { name: 'ndjson', multiline: false },
  };

  const firstDatastreamPath = `${integrationPath}/data_stream/${firstDatastreamName}`;
  const secondDatastreamPath = `${integrationPath}/data_stream/${secondDatastreamName}`;

  testIntegration.dataStreams = [firstDataStream, secondDataStream];

  beforeEach(async () => {
    jest.clearAllMocks();
    await buildIntegrationModule.buildPackage(testIntegration);
  });

  it('Should create expected directories and files', async () => {
    // Package & integration folders
    expect(Utils.ensureDirSync).toHaveBeenCalledWith(packagePath);
    expect(Utils.ensureDirSync).toHaveBeenCalledWith(integrationPath);

    // _dev files
    expect(Utils.ensureDirSync).toHaveBeenCalledWith(`${integrationPath}/_dev/build`);
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${integrationPath}/_dev/build/docs/README.md`,
      expect.any(String)
    );
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${integrationPath}/_dev/build/build.yml`,
      expect.any(String)
    );

    // Docs files
    expect(Utils.ensureDirSync).toHaveBeenCalledWith(`${integrationPath}/docs/`);
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.any(String)
    );

    // Changelog file
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${integrationPath}/changelog.yml`,
      expect.any(String)
    );

    // Manifest files
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${integrationPath}/manifest.yml`,
      expect.any(String)
    );
  });

  it('Should create only one entry in manifest per input type', async () => {
    const renderSpy = jest.spyOn(nunjucks, 'render');
    await buildIntegrationModule.buildPackage(testIntegration);

    expect(renderSpy).toHaveBeenCalledWith(
      'package_manifest.yml.njk',
      expect.objectContaining({
        inputs: [
          {
            type: 'filestream',
            title: 'Datastream_1',
            description: 'Datastream_1 description',
          },
          {
            type: 'kafka',
            title: 'Datastream_1',
            description: 'Datastream_1 description',
          },
        ],
      })
    );
  });

  it('Should create logo files if info is present in the integration', async () => {
    testIntegration.logo = 'logo';

    await buildIntegrationModule.buildPackage(testIntegration);

    expect(Utils.ensureDirSync).toHaveBeenCalledWith(`${integrationPath}/img`);
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${integrationPath}/img/logo.svg`,
      expect.any(Buffer)
    );
  });

  it('Should not create logo files if info is not present in the integration', async () => {
    jest.clearAllMocks();
    testIntegration.logo = undefined;

    await buildIntegrationModule.buildPackage(testIntegration);

    expect(Utils.ensureDirSync).not.toHaveBeenCalledWith(`${integrationPath}/img`);
    expect(Utils.createSync).not.toHaveBeenCalledWith(
      `${integrationPath}/img/logo.svg`,
      expect.any(Buffer)
    );
  });

  it('Should call createDataStream for each datastream', async () => {
    expect(DataStreamModule.createDataStream).toHaveBeenCalledWith(
      'integration',
      firstDatastreamPath,
      firstDataStream
    );
    expect(DataStreamModule.createDataStream).toHaveBeenCalledWith(
      'integration',
      secondDatastreamPath,
      secondDataStream
    );
  });

  it('Should call createAgentInput for each datastream', async () => {
    expect(AgentModule.createAgentInput).toHaveBeenCalledWith(
      firstDatastreamPath,
      firstDataStreamInputTypes
    );
    expect(AgentModule.createAgentInput).toHaveBeenCalledWith(
      secondDatastreamPath,
      secondDataStreamInputTypes
    );
  });

  it('Should call createPipeline for each datastream', async () => {
    expect(PipelineModule.createPipeline).toHaveBeenCalledWith(
      firstDatastreamPath,
      firstDataStreamPipeline
    );
    expect(PipelineModule.createPipeline).toHaveBeenCalledWith(
      secondDatastreamPath,
      secondDataStreamPipeline
    );
  });

  it('Should call createFieldMapping for each datastream', async () => {
    expect(FieldsModule.createFieldMapping).toHaveBeenCalledWith(
      'integration',
      firstDatastreamName,
      firstDatastreamPath,
      firstDataStreamDocs
    );
    expect(FieldsModule.createFieldMapping).toHaveBeenCalledWith(
      'integration',
      secondDatastreamName,
      secondDatastreamPath,
      secondDataStreamDocs
    );
  });
});
