/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchPlaygroundPluginStart } from '../public';

export type Start = jest.Mocked<SearchPlaygroundPluginStart>;

const createStartMock = (): Start => {
  const startContract: Start = {
    PlaygroundProvider: jest.fn(),
    PlaygroundToolbar: jest.fn(),
    Playground: jest.fn(),
  };

  return startContract;
};

export const searchPlaygroundMock = {
  createStart: createStartMock,
};
