/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureDirSync, createSync } from '../util';
import { createAgentInput } from './agent';
import { InputType } from '../../common';

jest.mock('../util', () => ({
  ...jest.requireActual('../util'),
  createSync: jest.fn(),
  ensureDirSync: jest.fn(),
}));

describe('createAgentInput', () => {
  const dataStreamPath = 'path';

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Should create expected files', async () => {
    const inputTypes: InputType[] = ['aws-s3', 'filestream'];

    createAgentInput(dataStreamPath, inputTypes);

    expect(ensureDirSync).toHaveBeenCalledWith(`${dataStreamPath}/agent/stream`);

    expect(createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/agent/stream/aws-s3.yml.hbs`,
      expect.any(String)
    );
    expect(createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/agent/stream/filestream.yml.hbs`,
      expect.any(String)
    );
  });

  it('Should not create agent files if there are no input types', async () => {
    createAgentInput(dataStreamPath, []);

    expect(ensureDirSync).toHaveBeenCalledWith(`${dataStreamPath}/agent/stream`);
    expect(createSync).not.toHaveBeenCalled();
  });
});
