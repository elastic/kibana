/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { AppUpdater, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public/plugin';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { ReportingStart } from '@kbn/reporting-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import type { VisualizationsStart } from '@kbn/visualizations-plugin/public';

import { SESSIONSTORAGE_LASTPATH } from '../../common/lib';
import { getSessionStorage } from '../lib/storage';
import { CanvasStartDeps } from '../plugin';

export interface CanvasNavLinkService {
  updatePath: (path: string) => void;
}

export let kibanaVersion: string;

export let coreServices: CoreStart;
export let contentManagementService: ContentManagementPublicStart;
export let dataService: DataPublicPluginStart;
export let expressionsService: ExpressionsStart;
export let dataViewsService: DataViewsPublicPluginStart;
export let embeddableService: EmbeddableStart;
export let presentationUtilService: PresentationUtilPluginStart;
export let reportingService: ReportingStart | undefined;
export let spacesService: SpacesApi | undefined;
export let uiActionsService: UiActionsPublicStart;
export let visualizationsService: VisualizationsStart;

export let navLinksService: CanvasNavLinkService;

const servicesReady$ = new BehaviorSubject(false);

export const setKibanaServices = (
  kibanaCore: CoreStart,
  deps: CanvasStartDeps,
  initContext: PluginInitializerContext,
  appUpdater?: BehaviorSubject<AppUpdater>
) => {
  kibanaVersion = initContext.env.packageInfo.version;

  coreServices = kibanaCore;
  contentManagementService = deps.contentManagement;
  dataService = deps.data;
  expressionsService = deps.expressions;
  dataViewsService = deps.dataViews;
  embeddableService = deps.embeddable;
  presentationUtilService = deps.presentationUtil;
  reportingService = kibanaCore.application.capabilities.canvas?.generatePdf
    ? deps.reporting
    : undefined;
  spacesService = deps.spaces;
  uiActionsService = deps.uiActions;
  visualizationsService = deps.visualizations;

  navLinksService = {
    updatePath: (path: string) => {
      appUpdater?.next(() => ({
        defaultPath: `${path}`,
      }));

      getSessionStorage().set(`${SESSIONSTORAGE_LASTPATH}:${kibanaCore.http.basePath.get()}`, path);
    },
  };

  servicesReady$.next(true);
};

export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};
