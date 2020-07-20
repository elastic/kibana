/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasServiceFactory } from '.';
import { CoreStart } from '../plugin';

type Getter<T> = () => T;

export interface PlatformService {
  getBasePath: CoreStart['http']['basePath']['get'];
  getDocLinkVersion: Getter<CoreStart['docLinks']['DOC_LINK_VERSION']>;
  getElasticWebsiteUrl: Getter<CoreStart['docLinks']['ELASTIC_WEBSITE_URL']>;
  getHasWriteAccess: Getter<CoreStart['application']['capabilities'][string][string]>;
  getSavedObjectsClient: Getter<CoreStart['savedObjects']['client']>;
  getUISettingsClient: Getter<CoreStart['uiSettings']>;
  setBreadcrumbs: CoreStart['chrome']['setBreadcrumbs'];
  setRecentlyAccessed: CoreStart['chrome']['recentlyAccessed']['add'];
}

export const platformServiceFactory: CanvasServiceFactory<PlatformService> = (
  _coreSetup,
  coreStart
) => {
  return {
    getBasePath: coreStart.http.basePath.get,
    getElasticWebsiteUrl: () => coreStart.docLinks.ELASTIC_WEBSITE_URL,
    getDocLinkVersion: () => coreStart.docLinks.DOC_LINK_VERSION,
    getHasWriteAccess: () => coreStart.application.capabilities.canvas.save,
    getSavedObjectsClient: () => coreStart.savedObjects.client,
    getUISettingsClient: () => coreStart.uiSettings,
    setBreadcrumbs: coreStart.chrome.setBreadcrumbs,
    setRecentlyAccessed: coreStart.chrome.recentlyAccessed.add,
  };
};
