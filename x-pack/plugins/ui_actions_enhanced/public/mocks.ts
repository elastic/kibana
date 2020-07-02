/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart } from '../../../../src/core/public';
import { coreMock } from '../../../../src/core/public/mocks';
import { uiActionsPluginMock } from '../../../../src/plugins/ui_actions/public/mocks';
import { embeddablePluginMock } from '../../../../src/plugins/embeddable/public/mocks';
import { AdvancedUiActionsSetup, AdvancedUiActionsStart } from '.';
import { plugin as pluginInitializer } from '.';
import { licensingMock } from '../../licensing/public/mocks';

export type Setup = jest.Mocked<AdvancedUiActionsSetup>;
export type Start = jest.Mocked<AdvancedUiActionsStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    ...uiActionsPluginMock.createSetupContract(),
    registerDrilldown: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    ...uiActionsPluginMock.createStartContract(),
    getActionFactories: jest.fn(),
    getActionFactory: jest.fn(),
    FlyoutManageDrilldowns: jest.fn(),
  };

  return startContract;
};

const createPlugin = (
  coreSetup: CoreSetup = coreMock.createSetup(),
  coreStart: CoreStart = coreMock.createStart()
) => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const uiActions = uiActionsPluginMock.createPlugin();
  const embeddable = embeddablePluginMock.createInstance({
    uiActions: uiActions.setup,
  });
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = plugin.setup(coreSetup, {
    uiActions: uiActions.setup,
    embeddable: embeddable.setup,
  });

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: (anotherCoreStart: CoreStart = coreStart) => {
      const uiActionsStart = uiActions.doStart();
      const embeddableStart = embeddable.doStart({
        uiActions: uiActionsStart,
      });
      return plugin.start(anotherCoreStart, {
        uiActions: uiActionsStart,
        embeddable: embeddableStart,
        licensing: licensingMock.createStart(),
      });
    },
  };
};

export const uiActionsEnhancedPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
