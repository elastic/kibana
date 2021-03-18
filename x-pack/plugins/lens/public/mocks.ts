/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensPublicStart } from '.';

export type Start = jest.Mocked<LensPublicStart>;

const createStartContract = (): Start => {
  const startContract: Start = {
    EmbeddableComponent: jest.fn(() => null),
    canUseEditor: jest.fn(() => true),
    navigateToPrefilledEditor: jest.fn(),
  };
  return startContract;
};

export const lensPluginMock = {
  createStartContract,
};
