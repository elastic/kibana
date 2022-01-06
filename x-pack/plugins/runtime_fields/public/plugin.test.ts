/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/public';
import { coreMock, themeServiceMock } from 'src/core/public/mocks';

jest.mock('../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../src/plugins/kibana_react/public');

  return {
    ...original,
    toMountPoint: (node: React.ReactNode) => node,
  };
});

import { StartPlugins, PluginStart } from './types';
import { RuntimeFieldEditorFlyoutContent } from './components';
import { RuntimeFieldsPlugin } from './plugin';

const noop = () => {};

describe('RuntimeFieldsPlugin', () => {
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
    const onSaveSpy = jest.fn();

    const mockCore = {
      overlays: {
        openFlyout,
      },
      uiSettings: {},
      theme: themeServiceMock.createStartContract(),
    };
    coreSetup.getStartServices = async () => [mockCore] as any;
    const setupApi = await plugin.setup(coreSetup, {});
    const { openEditor } = await setupApi.loadEditor();

    openEditor({ onSave: onSaveSpy });

    expect(openFlyout).toHaveBeenCalled();

    const [[arg]] = openFlyout.mock.calls;
    expect(arg.props.children.type).toBe(RuntimeFieldEditorFlyoutContent);

    // We force call the "onSave" prop from the <RuntimeFieldEditorFlyoutContent /> component
    // and make sure that the the spy is being called.
    // Note: we are testing implementation details, if we change or rename the "onSave" prop on
    // the component, we will need to update this test accordingly.
    expect(arg.props.children.props.onSave).toBeDefined();
    arg.props.children.props.onSave();
    expect(onSaveSpy).toHaveBeenCalled();
  });

  test('should return a handler to close the flyout', async () => {
    const setupApi = await plugin.setup(coreSetup, {});
    const { openEditor } = await setupApi.loadEditor();

    const closeEditorHandler = openEditor({ onSave: noop });
    expect(typeof closeEditorHandler).toBe('function');
  });
});
