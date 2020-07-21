/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  IUiSettingsClient,
  ChromeBreadcrumb,
} from '../../../../../src/core/public';
import { CanvasServiceFactory } from '.';

export interface PlatformService {
  getBasePath: () => string;
  getDocLinkVersion: () => string;
  getElasticWebsiteUrl: () => string;
  getHasWriteAccess: () => boolean;
  getSavedObjectsClient: () => SavedObjectsClientContract;
  getUISettingsClient: () => IUiSettingsClient;
  setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
  setRecentlyAccessed: (link: string, label: string, id: string) => void;
}

export const platformServiceFactory: CanvasServiceFactory<PlatformService> = (
  _coreSetup,
  coreStart
) => {
  return {
    getBasePath: coreStart.http.basePath.get,
    getElasticWebsiteUrl: () => coreStart.docLinks.ELASTIC_WEBSITE_URL,
    getDocLinkVersion: () => coreStart.docLinks.DOC_LINK_VERSION,
    // TODO: is there a better type for this?  The capabilities type allows for a Record,
    // though we don't do this.  So this cast may be the best option.
    getHasWriteAccess: () => coreStart.application.capabilities.canvas.save as boolean,
    getSavedObjectsClient: () => coreStart.savedObjects.client,
    getUISettingsClient: () => coreStart.uiSettings,
    setBreadcrumbs: coreStart.chrome.setBreadcrumbs,
    setRecentlyAccessed: coreStart.chrome.recentlyAccessed.add,
  };
};
