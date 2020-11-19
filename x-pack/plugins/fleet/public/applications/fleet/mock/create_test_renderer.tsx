/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMemoryHistory } from 'history';
import React, { memo } from 'react';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { ScopedHistory } from 'kibana/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { FleetAppContext } from '../app';
import {
  IngestManagerConfigType,
  IngestManagerSetupDeps,
  IngestManagerStart,
  IngestManagerStartDeps,
} from '../../../plugin';
import { createSetupDepsMock, createStartDepsMock } from './plugin_dependencies';
import { createPluginConfigurationMock } from './plugin_configuration';
import { UIExtensionsStorage } from '../types';
import { createIngestManagerStartMock } from './plugin_interfaces';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

export interface TestRenderer {
  history: ScopedHistory;
  coreStart: ReturnType<typeof coreMock.createStart>;
  setupDeps: IngestManagerSetupDeps;
  startDeps: IngestManagerStartDeps;
  config: IngestManagerConfigType;
  startInterface: IngestManagerStart;
  AppWrapper: React.FC<any>;
  render: UiRender;
}

export const createTestRendererMock = (): TestRenderer => {
  const basePath = '/mock';
  const history = new ScopedHistory(createMemoryHistory({ initialEntries: [basePath] }), basePath);
  const coreStart = coreMock.createStart({ basePath: '/mock' });
  const setupDeps = createSetupDepsMock();
  const startDeps = createStartDepsMock();
  const config = createPluginConfigurationMock();
  const extensions: UIExtensionsStorage = {};
  const startInterface: IngestManagerStart = createIngestManagerStartMock(extensions);

  const AppWrapper: React.FC = memo(({ children }) => {
    return (
      <FleetAppContext
        basepath={'/mock'}
        coreStart={coreStart}
        setupDeps={setupDeps}
        startDeps={startDeps}
        config={config}
        history={history}
        kibanaVersion={'8.0.0'}
        extensions={extensions}
      >
        {children}
      </FleetAppContext>
    );
  });

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ...options,
    });
  };

  return {
    history,
    coreStart,
    setupDeps,
    startDeps,
    config,
    startInterface,
    AppWrapper,
    render,
  };
};
