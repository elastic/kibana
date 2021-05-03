/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import type { MockedKeys } from '@kbn/utility-types/jest';

import { coreMock } from '../../../../../../../src/core/public/mocks';
import type { IStorage } from '../../../../../../../src/plugins/kibana_utils/public';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { setHttpClient } from '../hooks/use_request';

import { createStartDepsMock } from './plugin_dependencies';
import type { MockedFleetStartServices } from './types';

// Taken from core. See: src/plugins/kibana_utils/public/storage/storage.test.ts
const createMockStore = (): MockedKeys<IStorage> => {
  let store: Record<string, any> = {};
  return {
    getItem: jest.fn().mockImplementation((key) => store[key]),
    setItem: jest.fn().mockImplementation((key, value) => (store[key] = value)),
    removeItem: jest.fn().mockImplementation((key: string) => delete store[key]),
    clear: jest.fn().mockImplementation(() => (store = {})),
  };
};

const configureStartServices = (services: MockedFleetStartServices): void => {
  // Store the http for use by useRequest
  setHttpClient(services.http);

  // Set Fleet available capabilities
  services.application.capabilities = {
    ...services.application.capabilities,
    fleet: {
      read: true,
      write: true,
    },
  };

  // Setup the `i18n.Context` component
  services.i18n.Context.mockImplementation(({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  ));
};

export const createStartServices = (basePath: string = '/mock'): MockedFleetStartServices => {
  const startServices: MockedFleetStartServices = {
    ...coreMock.createStart({ basePath }),
    ...createStartDepsMock(),
    storage: new Storage(createMockStore()) as jest.Mocked<Storage>,
  };

  configureStartServices(startServices);

  return startServices;
};
