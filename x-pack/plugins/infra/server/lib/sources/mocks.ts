/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { InfraSources } from './sources';

type IInfraSources = Pick<InfraSources, keyof InfraSources>;

export const createInfraSourcesMock = (): jest.Mocked<IInfraSources> => ({
  getSourceConfiguration: jest.fn(),
  createSourceConfiguration: jest.fn(),
  deleteSourceConfiguration: jest.fn(),
  updateSourceConfiguration: jest.fn(),
  getAllSourceConfigurations: jest.fn(),
  getInternalSourceConfiguration: jest.fn(),
  defineInternalSourceConfiguration: jest.fn(),
});
