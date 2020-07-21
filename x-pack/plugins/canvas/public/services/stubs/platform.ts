/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PlatformService } from '../platform';

const noop = (..._args: any[]): any => {};

export const platformService: PlatformService = {
  getBasePath: () => '/base/path',
  getDocLinkVersion: () => 'dockLinkVersion',
  getElasticWebsiteUrl: () => 'https://elastic.co',
  getHasWriteAccess: () => true,
  getSavedObjectsClient: noop,
  getUISettingsClient: noop,
  setBreadcrumbs: noop,
  setRecentlyAccessed: noop,
};
