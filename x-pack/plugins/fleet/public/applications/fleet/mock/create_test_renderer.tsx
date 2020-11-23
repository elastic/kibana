/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMemoryHistory } from 'history';
import React, { memo } from 'react';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { ScopedHistory } from '../../../../../../../src/core/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { IStorage, Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { FleetAppContext } from '../app';
import { FleetConfigType, FleetStart, FleetStartServices } from '../../../plugin';
import { createStartDepsMock } from './plugin_dependencies';
import { createConfigurationMock } from './plugin_configuration';
import { UIExtensionsStorage } from '../types';
import { createStartMock } from './plugin_interfaces';
import { MockedKeys } from '../../../../../../../packages/kbn-utility-types/jest/index';
import { setHttpClient } from '../hooks/use_request';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

export interface TestRenderer {
  history: ScopedHistory;
  startServices: FleetStartServices;
  config: FleetConfigType;
  /** The Interface returned by the Fleet plugin `start()` phase */
  startInterface: FleetStart;
  kibanaVersion: string;
  AppWrapper: React.FC<any>;
  render: UiRender;
}

const createMockStore = (): MockedKeys<IStorage> => {
  let store: Record<string, any> = {};
  return {
    getItem: jest.fn().mockImplementation((key) => store[key]),
    setItem: jest.fn().mockImplementation((key, value) => (store[key] = value)),
    removeItem: jest.fn().mockImplementation((key: string) => delete store[key]),
    clear: jest.fn().mockImplementation(() => (store = {})),
  };
};

const configureStartServices = (services: FleetStartServices): void => {
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
};

export const createTestRendererMock = (): TestRenderer => {
  const basePath = '/mock';
  const extensions: UIExtensionsStorage = {};
  const startServices: FleetStartServices = {
    ...coreMock.createStart({ basePath }),
    ...createStartDepsMock(),
    storage: new Storage(createMockStore()),
  };

  configureStartServices(startServices);

  const testRendererMocks: TestRenderer = {
    history: new ScopedHistory(createMemoryHistory({ initialEntries: [basePath] }), basePath),
    startServices,
    config: createConfigurationMock(),
    startInterface: createStartMock(extensions),
    kibanaVersion: '8.0.0',
    AppWrapper: memo(({ children }) => {
      return (
        <FleetAppContext
          basepath={basePath}
          startServices={testRendererMocks.startServices}
          config={testRendererMocks.config}
          history={testRendererMocks.history}
          kibanaVersion={testRendererMocks.kibanaVersion}
          extensions={extensions}
        >
          {children}
        </FleetAppContext>
      );
    }),
    render: (ui, options) => {
      return reactRender(ui, {
        wrapper: testRendererMocks.AppWrapper,
        ...options,
      });
    },
  };

  return testRendererMocks;
};
