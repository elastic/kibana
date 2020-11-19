/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IngestManagerStart } from '../../../plugin';
import { UIExtensionsStorage } from '../types';
import { createExtensionRegistrationCallback } from '../services/ui_extensions';

export const createStartMock = (
  extensionsStorage: UIExtensionsStorage = {}
): IngestManagerStart => {
  return {
    isInitialized: jest.fn().mockResolvedValue(true),
    registerExtension: createExtensionRegistrationCallback(extensionsStorage),
  };
};
