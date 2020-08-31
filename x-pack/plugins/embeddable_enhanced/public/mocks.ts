/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableEnhancedSetupContract, EmbeddableEnhancedStartContract } from '.';

export type Setup = jest.Mocked<EmbeddableEnhancedSetupContract>;
export type Start = jest.Mocked<EmbeddableEnhancedStartContract>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {};

  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {};

  return startContract;
};

export const embeddableEnhancedPluginMock = {
  createSetupContract,
  createStartContract,
};
