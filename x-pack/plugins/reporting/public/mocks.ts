/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/public/mocks';
import { ReportingSetup } from '.';
import { getDefaultLayoutSelectors } from '../common';
import { getSharedComponents } from './components/shared';

type Setup = jest.Mocked<ReportingSetup>;

const createSetupContract = (): Setup => {
  const coreSetup = coreMock.createSetup();
  return {
    getDefaultLayoutSelectors: jest.fn().mockImplementation(getDefaultLayoutSelectors),
    usesUiCapabilities: jest.fn().mockImplementation(() => true),
    components: getSharedComponents(coreSetup),
  };
};

export const reportingPluginMock = {
  createSetupContract,
  createStartContract: createSetupContract,
};
