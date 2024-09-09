/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessPluginStart } from './types';

const startMock = (): ServerlessPluginStart => ({
  initNavigation: jest.fn(),
  setBreadcrumbs: jest.fn(),
  setProjectHome: jest.fn(),
  setSideNavComponentDeprecated: jest.fn(),
  getNavigationCards: jest.fn(),
});

export const serverlessMock = {
  createStart: startMock,
};
