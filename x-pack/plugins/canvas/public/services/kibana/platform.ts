/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';

import { CanvasStartDeps } from '../../plugin';
import { CanvasPlatformService } from '../platform';

export type CanvaPlatformServiceFactory = KibanaPluginServiceFactory<
  CanvasPlatformService,
  CanvasStartDeps
>;

export const platformServiceFactory: CanvaPlatformServiceFactory = ({ coreStart, initContext }) => {
  if (!initContext) {
    throw new Error('Canvas platform service requires init context');
  }

  return {
    getBasePath: coreStart.http.basePath.get,
    getBasePathInterface: () => coreStart.http.basePath,
    getElasticWebsiteUrl: () => coreStart.docLinks.ELASTIC_WEBSITE_URL,
    getDocLinkVersion: () => coreStart.docLinks.DOC_LINK_VERSION,
    getKibanaVersion: () => initContext.env.packageInfo.version,
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
