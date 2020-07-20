/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasServices, services } from '.';
import { PlatformService } from './platform';
import { NavLinkService } from './nav_link';
import { NotifyService } from './notify';
import { ExpressionsService } from '../../../../../src/plugins/expressions/common';
import { SavedObjectsClient, IUiSettingsClient } from '../../../../../src/core/public';

const expressionServiceMock: ExpressionsService = {} as ExpressionsService;

const platformServiceMock: PlatformService = {
  getBasePath: () => 'basePath',
  getDocLinkVersion: () => 'dockLinkVersion',
  getElasticWebsiteUrl: () => 'elastic web url',
  getHasWriteAccess: () => true,
  getSavedObjectsClient: () => ({} as SavedObjectsClient),
  getUISettingsClient: () => ({} as IUiSettingsClient),
  setBreadcrumbs: () => console.log('setting breadcrumbs', arguments),
  setRecentlyAccessed: () => console.log('setting recently accessed', arguments),
};

const navLinkServiceMock: NavLinkService = {
  updatePath: () => undefined,
};

const notifyServiceMock: NotifyService = {
  error: (err, opts) => console.log('error: ', err, opts),
  warning: (err, opts) => console.log('warning: ', err, opts),
  info: (err, opts) => console.log('info: ', err, opts),
  success: (err, opts) => console.log('success: ', err, opts),
};

export const serviceMocks: CanvasServices = {
  expressions: expressionServiceMock,
  notify: notifyServiceMock,
  navLink: navLinkServiceMock,
  platform: platformServiceMock,
};

export const startMockServices = async (providedMocks: Partial<CanvasServices>) => {
  Object.entries(services).map(([key, provider]) => {
    const mock = providedMocks[key] || serviceMocks[key];

    provider.mockService(mock);
  });
};
