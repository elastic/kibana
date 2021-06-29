/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';

export const kibanaContextMock = {
  services: {
    uiSettings: { get: jest.fn() },
    chrome: { recentlyAccessed: { add: jest.fn() } },
    application: { navigateToApp: jest.fn() },
    http: {
      basePath: {
        get: jest.fn(),
      },
    },
    share: {
      urlGenerators: { getUrlGenerator: jest.fn() },
    },
    data: dataPluginMock.createStartContract(),
  },
};

export const useMlKibana = jest.fn(() => {
  return kibanaContextMock;
});
