/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMemoryHistory } from 'history';
import React, { memo } from 'react';
import { render as reactRender, RenderOptions, RenderResult, act } from '@testing-library/react';
import { ScopedHistory } from '../../../../../../../src/core/public';
import { FleetAppContext } from '../app';
import { FleetConfigType, FleetStart, FleetStartServices } from '../../../plugin';
import { createConfigurationMock } from './plugin_configuration';
import { UIExtensionsStorage } from '../types';
import { createStartMock } from './plugin_interfaces';
import { createStartServices } from './fleet_start_services';

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

export const createTestRendererMock = (): TestRenderer => {
  const basePath = '/mock';
  const extensions: UIExtensionsStorage = {};
  const startServices = createStartServices(basePath);
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
      let renderResponse: RenderResult;
      act(() => {
        renderResponse = reactRender(ui, {
          wrapper: testRendererMocks.AppWrapper,
          ...options,
        });
      });
      // @ts-ignore
      return renderResponse;
    },
  };

  return testRendererMocks;
};
