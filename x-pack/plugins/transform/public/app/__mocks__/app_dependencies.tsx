/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';

import type { ScopedHistory } from 'kibana/public';

import { coreMock } from '../../../../../../src/core/public/mocks';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { savedObjectsPluginMock } from '../../../../../../src/plugins/saved_objects/public/mocks';
import { SharePluginStart } from '../../../../../../src/plugins/share/public';

import { Storage } from '../../../../../../src/plugins/kibana_utils/public';

import type { AppDependencies } from '../app_dependencies';
import { MlSharedContext } from './shared_context';
import type { GetMlSharedImportsReturnType } from '../../shared_imports';

const coreSetup = coreMock.createSetup();
const coreStart = coreMock.createStart();
const dataStart = dataPluginMock.createStartContract();

// Replace mock to support syntax using `.then()` as used in transform code.
coreStart.savedObjects.client.find = jest.fn().mockResolvedValue({ savedObjects: [] });

const appDependencies: AppDependencies = {
  application: coreStart.application,
  chrome: coreStart.chrome,
  data: dataStart,
  docLinks: coreStart.docLinks,
  i18n: coreStart.i18n,
  notifications: coreSetup.notifications,
  uiSettings: coreStart.uiSettings,
  savedObjects: coreStart.savedObjects,
  storage: ({ get: jest.fn() } as unknown) as Storage,
  overlays: coreStart.overlays,
  http: coreSetup.http,
  history: {} as ScopedHistory,
  savedObjectsPlugin: savedObjectsPluginMock.createStartContract(),
  share: ({ urlGenerators: { getUrlGenerator: jest.fn() } } as unknown) as SharePluginStart,
  ml: {} as GetMlSharedImportsReturnType,
};

export const useAppDependencies = () => {
  const ml = useContext(MlSharedContext);
  return { ...appDependencies, ml };
};

export const useToastNotifications = () => {
  return { ...coreSetup.notifications, addDanger: jest.fn() };
};
