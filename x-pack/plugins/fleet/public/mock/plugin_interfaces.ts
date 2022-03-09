/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UIExtensionsStorage } from '../types';
import { createExtensionRegistrationCallback } from '../services/ui_extensions';

import type { MockedFleetStart } from './types';

export const createStartMock = (extensionsStorage: UIExtensionsStorage = {}): MockedFleetStart => {
  return {
    isInitialized: jest.fn().mockResolvedValue(true),
    registerExtension: createExtensionRegistrationCallback(extensionsStorage),
    authz: {
      fleet: {
        all: true,
        setup: true,
        readEnrollmentTokens: true,
        readAgentPolicies: true,
      },
      integrations: {
        readPackageInfo: true,
        readInstalledPackages: true,
        installPackages: true,
        upgradePackages: true,
        uploadPackages: true,
        removePackages: true,
        readPackageSettings: true,
        writePackageSettings: true,
        readIntegrationPolicies: true,
        writeIntegrationPolicies: true,
      },
    },
  };
};
