/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMemoryHistory } from 'history';
import React, { memo } from 'react';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { ScopedHistory } from 'src/core/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { FleetAppContext } from '../app';
import { FleetConfigType, FleetSetupDeps, FleetStartDeps, FleetStart } from '../../../plugin';
import { createSetupDepsMock, createStartDepsMock } from './plugin_dependencies';
import { createConfigurationMock } from './plugin_configuration';
import { UIExtensionsStorage } from '../types';
import { createStartMock } from './plugin_interfaces';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

export interface TestRenderer {
  history: ScopedHistory;
  coreStart: ReturnType<typeof coreMock.createStart>;
  setupDeps: FleetSetupDeps;
  startDeps: FleetStartDeps;
  config: FleetConfigType;
  startInterface: FleetStart;
  kibanaVersion: string;
  AppWrapper: React.FC<any>;
  render: UiRender;
}

export const createTestRendererMock = (): TestRenderer => {
  const basePath = '/mock';
  const history = new ScopedHistory(createMemoryHistory({ initialEntries: [basePath] }), basePath);
  const coreStart = coreMock.createStart({ basePath: '/mock' });
  const setupDeps = createSetupDepsMock();
  const startDeps = createStartDepsMock();
  const config = createConfigurationMock();
  const extensions: UIExtensionsStorage = {};
  const startInterface = createStartMock(extensions);

  const testRendererMocks: TestRenderer = {
    history,
    coreStart,
    setupDeps,
    startDeps,
    config,
    startInterface,
    kibanaVersion: '8.0.0',
    AppWrapper: memo(({ children }) => {
      return (
        <FleetAppContext
          basepath={'/mock'}
          coreStart={coreStart}
          config={config}
          history={history}
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
