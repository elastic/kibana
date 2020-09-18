/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsStart,
  SavedObjectsClientContract,
  IUiSettingsClient,
  ChromeBreadcrumb,
  IBasePath,
  ChromeStart,
} from '../../../../../src/core/public';
import { CanvasServiceFactory } from '.';

export interface PlatformService {
  getBasePath: () => string;
  getBasePathInterface: () => IBasePath;
  getDocLinkVersion: () => string;
  getElasticWebsiteUrl: () => string;
  getHasWriteAccess: () => boolean;
  getUISetting: (key: string, defaultValue?: any) => any;
  setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
  setRecentlyAccessed: (link: string, label: string, id: string) => void;
  setFullscreen: ChromeStart['setIsVisible'];

  // TODO: these should go away.  We want thin accessors, not entire objects.
  // Entire objects are hard to mock, and hide our dependency on the external service.
  getSavedObjects: () => SavedObjectsStart;
  getSavedObjectsClient: () => SavedObjectsClientContract;
  getUISettings: () => IUiSettingsClient;
}

export const platformServiceFactory: CanvasServiceFactory<PlatformService> = (
  _coreSetup,
  coreStart
) => {
  return {
    getBasePath: coreStart.http.basePath.get,
    getBasePathInterface: () => coreStart.http.basePath,
    getElasticWebsiteUrl: () => coreStart.docLinks.ELASTIC_WEBSITE_URL,
    getDocLinkVersion: () => coreStart.docLinks.DOC_LINK_VERSION,
    // TODO: is there a better type for this?  The capabilities type allows for a Record,
    // though we don't do this.  So this cast may be the best option.
    getHasWriteAccess: () => coreStart.application.capabilities.canvas.save as boolean,
    getUISetting: coreStart.uiSettings.get.bind(coreStart.uiSettings),
    setBreadcrumbs: coreStart.chrome.setBreadcrumbs,
    setRecentlyAccessed: coreStart.chrome.recentlyAccessed.add,
    setFullscreen: coreStart.chrome.setIsVisible,

    // TODO: these should go away.  We want thin accessors, not entire objects.
    // Entire objects are hard to mock, and hide our dependency on the external service.
    getSavedObjects: () => coreStart.savedObjects,
    getSavedObjectsClient: () => coreStart.savedObjects.client,
    getUISettings: () => coreStart.uiSettings,
  };
};
