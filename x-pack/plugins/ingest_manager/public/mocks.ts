/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IngestManagerPlugin } from './plugin';

export type Start = jest.Mocked<ReturnType<IngestManagerPlugin['start']>>;

const createStartContract = (): Start => {
  return {
    setup: jest.fn(),
    isInitialized: jest.fn(),
  };
};

export const ingestManagerPluginMock = {
  createStartContract,
};
