/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { type TransformEnabledFeatures } from './serverless_context';
import type { PluginsDependencies } from '../plugin';

import type { ExperimentalFeatures } from '../../server/config';
import type { AppDependencies } from './app_dependencies';
import { breadcrumbService } from './services/navigation';
import { docTitleService } from './services/navigation';
import { textService } from './services/text';
import { renderApp } from './app';

const localStorage = new Storage(window.localStorage);

export async function mountManagementSection(
  coreSetup: CoreSetup<PluginsDependencies>,
  params: ManagementAppMountParams,
  isServerless: boolean,
  experimentalFeatures: ExperimentalFeatures
) {
  const { element, setBreadcrumbs, history } = params;
  const { http, getStartServices } = coreSetup;
  const startServices = await getStartServices();
  const [core, plugins] = startServices;
  const {
    analytics,
    application,
    chrome,
    docLinks,
    i18n,
    overlays,
    theme,
    savedObjects,
    uiSettings,
    settings,
    notifications,
  } = core;
  const {
    data,
    dataViews,
    dataViewEditor,
    share,
    spaces,
    triggersActionsUi,
    unifiedSearch,
    charts,
    fieldFormats,
    savedObjectsManagement,
    savedSearch,
    contentManagement,
  } = plugins;
  const { docTitle } = chrome;

  // Initialize services
  textService.init();
  docTitleService.init(docTitle.change);
  breadcrumbService.setup(setBreadcrumbs);

  // AppCore/AppPlugins to be passed on as React context
  const appDependencies: AppDependencies = {
    analytics,
    application,
    chrome,
    data,
    dataViewEditor,
    dataViews,
    docLinks,
    http,
    i18n,
    notifications,
    overlays,
    theme,
    savedObjects,
    storage: localStorage,
    uiSettings,
    settings,
    history,
    share,
    spaces,
    triggersActionsUi,
    unifiedSearch,
    charts,
    fieldFormats,
    savedObjectsManagement,
    savedSearch,
    contentManagement,
  };

  const enabledFeatures: TransformEnabledFeatures = {
    showNodeInfo: !isServerless,
  };
  const unmountAppCallback = renderApp(
    element,
    appDependencies,
    enabledFeatures,
    experimentalFeatures
  );

  return () => {
    docTitle.reset();
    unmountAppCallback();
  };
}
