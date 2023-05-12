/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import type { FleetFileClientInterface } from './types';
import type { FleetFile } from './types';

export const createFleetFilesClientMock = (): jest.Mocked<FleetFileClientInterface> => {
  return {
    get: jest.fn(async (_) => createFleetFileMock()),
    create: jest.fn(async (_, agents) => Object.assign(createFleetFileMock(), { agents })),
    update: jest.fn(async (_, __) => createFleetFileMock()),
    delete: jest.fn(),
    doesFileHaveData: jest.fn().mockReturnValue(Promise.resolve(true)),
    download: jest.fn(async (_) => {
      return {
        stream: Readable.from(['test']),
        fileName: 'foo.txt',
        mimeType: 'text/plain',
      };
    }),
  };
};

export const createFleetFileMock = (): FleetFile => {
  return {
    id: '123-456-789',
    actionId: '321-654',
    agents: ['111-222'],
    name: 'foo.txt',
    status: 'READY',
    mimeType: 'text/plain',
    size: 45632,
    sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
  };
};
