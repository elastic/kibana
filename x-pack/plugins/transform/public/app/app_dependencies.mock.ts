/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../../src/core/public/mocks';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';

import { getAppProviders, AppDependencies } from './app_dependencies';

const coreSetup = coreMock.createSetup();
const coreStart = coreMock.createStart();
const dataStart = dataPluginMock.createStartContract();

const appDependencies: AppDependencies = {
  chrome: coreStart.chrome,
  data: dataStart,
  docLinks: coreStart.docLinks,
  i18n: coreStart.i18n,
  notifications: coreStart.notifications,
  uiSettings: coreStart.uiSettings,
  savedObjects: coreStart.savedObjects,
  overlays: coreStart.overlays,
  http: coreSetup.http,
};

export const Providers = getAppProviders(appDependencies);
