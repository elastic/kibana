/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Utils from '../util';
import * as nunjucks from 'nunjucks';
import { createFieldMapping } from './fields';
import { Docs } from '../../common';

jest.mock('nunjucks');

jest.mock('../util', () => ({
  ...jest.requireActual('../util'),
  createSync: jest.fn(),
}));

const mockedTemplate = 'mocked template';

(nunjucks.render as jest.Mock).mockReturnValue(mockedTemplate);

describe('createFieldMapping', () => {
  const dataStreamPath = 'path';
  const packageName = 'package';
  const dataStreamName = 'datastream';

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Should create fields files', async () => {
    const docs: Docs = [
      {
        key: 'foo',
        anotherKey: 'bar',
      },
    ];

    createFieldMapping(packageName, dataStreamName, dataStreamPath, docs);

    const expectedFields = `- name: key
  type: keyword
- name: anotherKey
  type: keyword
`;

    expect(Utils.createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/base-fields.yml`,
      mockedTemplate
    );
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/fields/fields.yml`,
      expectedFields
    );
  });

  it('Should create fields files even if docs value is empty', async () => {
    createFieldMapping(packageName, dataStreamName, dataStreamPath, []);

    const expectedFields = `[]
`;

    expect(Utils.createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/base-fields.yml`,
      mockedTemplate
    );
    expect(Utils.createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/fields/fields.yml`,
      expectedFields
    );
  });
  it('Should return all fields flattened', async () => {
    const docs: Docs = [
      {
        key: 'foo',
        anotherKey: 'bar',
      },
    ];

    const basedFields = `- name: data_stream.type
  type: constant_keyword
  description: Data stream type.
- name: data_stream.dataset
  type: constant_keyword
- name: "@timestamp"
  type: date
  description: Event timestamp.
`;
    (nunjucks.render as jest.Mock).mockReturnValue(basedFields);

    const fieldsResult = createFieldMapping(packageName, dataStreamName, dataStreamPath, docs);

    expect(fieldsResult).toEqual([
      { name: '@timestamp', type: 'date', description: 'Event timestamp.' },
      {
        description: undefined,
        name: 'anotherKey',
        type: 'keyword',
      },
      {
        description: undefined,
        name: 'data_stream.dataset',
        type: 'constant_keyword',
      },
      {
        description: 'Data stream type.',
        name: 'data_stream.type',
        type: 'constant_keyword',
      },
      {
        description: undefined,
        name: 'key',
        type: 'keyword',
      },
    ]);
  });
});
