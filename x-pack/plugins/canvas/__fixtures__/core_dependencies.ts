/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '../public/plugin';

export const coreStartMock = {
  application: {},
  chrome: {},
  docLinks: {},
  http: {},
  i18n: {},
  notifications: {},
  overlays: {},
  uiSettings: {},
  savedObjects: {},
  deprecations: {},
  theme: {},
  injectedMetadata: { getInjectedVar: {} },
  fatalErrors: {},
} as CoreStart;
