/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { testIntegration } from '../../__jest__/fixtures/build_integration';
import { ensureDirSync, createSync } from '../util';
import { configure } from 'nunjucks';
import { join as joinPath } from 'path';
import { createReadme } from './readme_files';

jest.mock('../util', () => ({
  ...jest.requireActual('../util'),
  createSync: jest.fn(),
  ensureDirSync: jest.fn(),
}));

describe('createReadme', () => {
  const integrationPath = 'path';

  const templateDir = joinPath(__dirname, '../templates');
  configure([templateDir], {
    autoescape: false,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Should create expected files', async () => {
    const fields = [
      {
        datastream: 'data_stream_1',
        fields: [
          {
            name: 'data_stream.type',
            type: 'constant_keyword',
            description: 'Data stream type.',
          },
          {
            name: 'data_stream.dataset',
            type: 'constant_keyword',
            description: 'Data stream dataset name.',
          },
          {
            name: 'event.dataset',
            type: 'constant_keyword',
            description: 'Event dataset',
            value: 'package.datastream',
          },
          { name: '@timestamp', type: 'date', description: 'Event timestamp.' },
        ],
      },
      {
        datastream: 'data_stream_2',
        fields: [{ name: '@timestamp', type: 'date', description: 'Event timestamp.' }],
      },
    ];

    createReadme(integrationPath, testIntegration.name, fields);

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/_dev/build/docs/README.md`,
      expect.any(String)
    );

    // Docs files
    expect(ensureDirSync).toHaveBeenCalledWith(`${integrationPath}/docs/`);
    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.any(String)
    );
  });

  it('Should render a table per datastream with fields mapping in package readme', async () => {
    const fields = [
      {
        datastream: 'data_stream_1',
        fields: [
          {
            name: 'data_stream.type',
            type: 'constant_keyword',
            description: 'Data stream type.',
          },
          {
            name: 'data_stream.dataset',
            type: 'constant_keyword',
          },
          {
            name: 'event.dataset',
            type: 'constant_keyword',
            description: 'Event dataset',
            value: 'package.datastream',
          },
          { name: '@timestamp', type: 'date', description: 'Event timestamp.' },
        ],
      },
      {
        datastream: 'data_stream_2',
        fields: [{ name: '@timestamp', type: 'date', description: 'Event timestamp.' }],
      },
    ];

    createReadme(integrationPath, testIntegration.name, fields);

    const firstDatastreamFieldsDisplayed = `
| Field | Description | Type |
|---|---|---|
| data_stream.type | Data stream type. | constant_keyword |
| data_stream.dataset |  | constant_keyword |
| event.dataset | Event dataset | constant_keyword |
| @timestamp | Event timestamp. | date |
`;

    const secondDatastreamFieldsDisplayed = `
| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
`;

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.stringContaining(firstDatastreamFieldsDisplayed)
    );

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.stringContaining(secondDatastreamFieldsDisplayed)
    );
  });

  it('Should not render a fields mapping table in build readme', async () => {
    const fields = [
      {
        datastream: 'data_stream_1',
        fields: [{ name: '@timestamp', type: 'date', description: 'Event timestamp.' }],
      },
    ];

    createReadme(integrationPath, testIntegration.name, fields);

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/_dev/build/docs/README.md`,
      expect.stringContaining('{{fields "data_stream_1"}}')
    );
  });

  it('Should render a formatted table per datastream with fields mapping in package readme', async () => {
    const fields = [
      {
        datastream: 'data_stream_1',
        fields: [
          {
            name: 'data_stream.type',
            type: 'constant_keyword',
            description: 'Data stream type.\n',
          },
          {
            name: 'data_stream.dataset',
            type: 'constant_keyword',
          },
        ],
      },
    ];

    createReadme(integrationPath, testIntegration.name, fields);

    const firstDatastreamFieldsDisplayed = `
| Field | Description | Type |
|---|---|---|
| data_stream.type | Data stream type. | constant_keyword |
| data_stream.dataset |  | constant_keyword |
`;

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.stringContaining(firstDatastreamFieldsDisplayed)
    );
  });
});
