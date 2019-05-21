/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EditorFramePlugin } from './plugin';
import { createMockDatasource, createMockVisualization } from './mock_extensions';

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

describe('editor_frame plugin', () => {
  let pluginInstance: EditorFramePlugin;
  let mountpoint: Element;

  beforeEach(() => {
    pluginInstance = new EditorFramePlugin();
    mountpoint = document.createElement('div');
  });

  afterEach(() => {
    mountpoint.remove();
  });

  it('should create an editor frame instance which mounts and unmounts', () => {
    expect(() => {
      const publicAPI = pluginInstance.setup();
      const instance = publicAPI.createInstance({});
      instance.mount(mountpoint);
      instance.unmount();
    }).not.toThrowError();
  });

  it('should render something in the provided dom element', () => {
    const publicAPI = pluginInstance.setup();
    const instance = publicAPI.createInstance({});
    instance.mount(mountpoint);

    expect(mountpoint.hasChildNodes()).toBe(true);

    instance.unmount();
  });

  it('should not have child nodes after unmount', () => {
    const publicAPI = pluginInstance.setup();
    const instance = publicAPI.createInstance({});
    instance.mount(mountpoint);
    instance.unmount();

    expect(mountpoint.hasChildNodes()).toBe(false);
  });

  it('should initialize and render provided datasource', async () => {
    const mockDatasource = createMockDatasource();
    const publicAPI = pluginInstance.setup();
    publicAPI.registerDatasource('test', mockDatasource);

    const instance = publicAPI.createInstance({});
    instance.mount(mountpoint);

    await waitForPromises();

    expect(mockDatasource.initialize).toHaveBeenCalled();
    expect(mockDatasource.renderDataPanel).toHaveBeenCalled();

    instance.unmount();
  });

  it('should initialize visualization and render config panel', async () => {
    const mockDatasource = createMockDatasource();
    const mockVisualization = createMockVisualization();
    const publicAPI = pluginInstance.setup();

    publicAPI.registerDatasource('test', mockDatasource);
    publicAPI.registerVisualization('test', mockVisualization);

    const instance = publicAPI.createInstance({});
    instance.mount(mountpoint);

    await waitForPromises();

    expect(mockVisualization.initialize).toHaveBeenCalled();
    expect(mockVisualization.renderConfigPanel).toHaveBeenCalled();

    instance.unmount();
  });
});
