/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIExtensionsStorage } from '../types';
import { createExtensionRegistrationCallback } from '../services/ui_extensions';
import { MockedFleetStart } from './types';

export const createStartMock = (extensionsStorage: UIExtensionsStorage = {}): MockedFleetStart => {
  return {
    isInitialized: jest.fn().mockResolvedValue(true),
    registerExtension: createExtensionRegistrationCallback(extensionsStorage),
  };
};
