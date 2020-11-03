/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { coreMock } from 'src/core/public/mocks';

import { StartPlugins, PluginStart } from './types';
import { RuntimeFieldsPlugin } from './plugin';

describe('RuntimeFieldsPlugin', () => {
  const noop = () => {};
  let coreSetup: CoreSetup<StartPlugins, PluginStart>;
  let plugin: RuntimeFieldsPlugin;

  beforeEach(() => {
    plugin = new RuntimeFieldsPlugin();
    coreSetup = coreMock.createSetup();
  });

  test('should return a handler to load the runtime field editor', async () => {
    const setupApi = await plugin.setup(coreSetup, {});
    expect(setupApi.loadEditor).toBeDefined();
  });

  test('once it is loaded it should expose a handler to open the editor', async () => {
    const setupApi = await plugin.setup(coreSetup, {});
    const response = await setupApi.loadEditor();
    expect(response.openEditor).toBeDefined();
  });

  test('should call core.overlays.openFlyout when opening the editor', async () => {
    const openFlyout = jest.fn();
    const mockCore = {
      overlays: {
        openFlyout,
      },
      uiSettings: {},
    };
    coreSetup.getStartServices = async () => [mockCore] as any;
    const setupApi = await plugin.setup(coreSetup, {});
    const { openEditor } = await setupApi.loadEditor();

    openEditor({ onSave: noop });

    expect(openFlyout).toHaveBeenCalled();
  });
});
