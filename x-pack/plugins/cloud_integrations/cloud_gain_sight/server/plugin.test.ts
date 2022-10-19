/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { registerGainsightRouteMock } from './plugin.test.mock';
import { CloudGainsightPlugin } from './plugin';

describe('Cloud Gainsight plugin', () => {
  let plugin: CloudGainsightPlugin;
  beforeEach(() => {
    registerGainsightRouteMock.mockReset();
    plugin = new CloudGainsightPlugin(coreMock.createPluginInitializerContext());
  });

  test('registers route when cloud is enabled', () => {
    plugin.setup(coreMock.createSetup(), {
      cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
    });
    expect(registerGainsightRouteMock).toHaveBeenCalledTimes(1);
  });

  test('does not register the route when cloud is disabled', () => {
    plugin.setup(coreMock.createSetup(), {
      cloud: { ...cloudMock.createSetup(), isCloudEnabled: false },
    });
    expect(registerGainsightRouteMock).not.toHaveBeenCalled();
  });
});
