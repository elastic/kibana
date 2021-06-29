/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PlatformService } from '../platform';

const noop = (..._args: any[]): any => {};

const uiSettings: Record<string, any> = {
  dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
};

const getUISetting = (setting: string) => uiSettings[setting];

export const platformService: PlatformService = {
  getBasePath: () => '/base/path',
  getBasePathInterface: noop,
  getDocLinkVersion: () => 'dockLinkVersion',
  getElasticWebsiteUrl: () => 'https://elastic.co',
  getHasWriteAccess: () => true,
  getUISetting,
  setBreadcrumbs: noop,
  setRecentlyAccessed: noop,
  getSavedObjects: noop,
  getSavedObjectsClient: noop,
  getUISettings: noop,
  setFullscreen: noop,
};
