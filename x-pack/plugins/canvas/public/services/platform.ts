/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsStart,
  SavedObjectsClientContract,
  IUiSettingsClient,
  ChromeBreadcrumb,
  IBasePath,
  ChromeStart,
} from '../../../../../src/core/public';

export interface CanvasPlatformService {
  getBasePath: () => string;
  getBasePathInterface: () => IBasePath;
  getDocLinkVersion: () => string;
  getElasticWebsiteUrl: () => string;
  getKibanaVersion: () => string;
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
