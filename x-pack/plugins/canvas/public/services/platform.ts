/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import {
  IUiSettingsClient,
  ChromeBreadcrumb,
  IBasePath,
  ChromeStart,
  HttpStart,
} from '@kbn/core/public';

import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';

export interface CanvasPlatformService {
  getBasePath: () => string;
  getBasePathInterface: () => IBasePath;
  getDocLinkVersion: () => string;
  getElasticWebsiteUrl: () => string;
  getKibanaVersion: () => string;
  getHasWriteAccess: () => boolean;
  getUISetting: (key: string, defaultValue?: any) => any;
  hasHeaderBanner$: () => Observable<boolean>;
  setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
  setRecentlyAccessed: (link: string, label: string, id: string) => void;
  setFullscreen: ChromeStart['setIsVisible'];
  redirectLegacyUrl?: SpacesPluginStart['ui']['redirectLegacyUrl'];
  getLegacyUrlConflict?: SpacesPluginStart['ui']['components']['getLegacyUrlConflict'];
  getUISettings: () => IUiSettingsClient;
  getHttp: () => HttpStart;
  getContentManagement: () => ContentManagementPublicStart;
}
