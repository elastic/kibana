/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const kibanaContextMock = {
  services: {
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
  },
};

export const useMlKibana = jest.fn(() => {
  return kibanaContextMock;
});
