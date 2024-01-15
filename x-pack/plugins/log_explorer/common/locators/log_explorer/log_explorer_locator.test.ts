/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { LogExplorerLocatorDefinition } from './log_explorer_locator';
import { LogExplorerLocatorDependencies } from './types';

const setup = async () => {
  const logExplorerLocatorDependencies: LogExplorerLocatorDependencies = {
    discoverAppLocator: sharePluginMock.createLocator(),
  };
  const logExplorerLocator = new LogExplorerLocatorDefinition(logExplorerLocatorDependencies);

  return {
    logExplorerLocator,
    discoverGetLocation: logExplorerLocatorDependencies.discoverAppLocator?.getLocation,
  };
};

describe('Logs Explorer Locators', () => {
  const dataset = 'logs-*-*';
  it('should call discover locator with empty params', async () => {
    const { logExplorerLocator, discoverGetLocation } = await setup();
    await logExplorerLocator.getLocation({});

    expect(discoverGetLocation).toBeCalledWith({});
  });

  it('should call discover locator with correct dataViewId if dataset is sent', async () => {
    const { logExplorerLocator, discoverGetLocation } = await setup();
    await logExplorerLocator.getLocation({ dataset });

    expect(discoverGetLocation).toBeCalledWith(
      expect.objectContaining({
        dataViewId: 'logs-*-*',
      })
    );
  });

  it('should call discover locator with correct dataViewSpec if dataset is sent', async () => {
    const { logExplorerLocator, discoverGetLocation } = await setup();
    await logExplorerLocator.getLocation({ dataset });

    expect(discoverGetLocation).toBeCalledWith(
      expect.objectContaining({
        dataViewId: 'logs-*-*',
        dataViewSpec: {
          id: 'logs-*-*',
          title: 'logs-*-*',
        },
      })
    );
  });
});
