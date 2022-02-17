/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from '../../../../../src/plugins/management/public/';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

import { PluginsDependencies } from '../plugin';
import { getMlSharedImports } from '../shared_imports';

import { AppDependencies } from './app_dependencies';
import { breadcrumbService } from './services/navigation';
import { docTitleService } from './services/navigation';
import { textService } from './services/text';
import { renderApp } from './app';

const localStorage = new Storage(window.localStorage);

export async function mountManagementSection(
  coreSetup: CoreSetup<PluginsDependencies>,
  params: ManagementAppMountParams
) {
  const { element, setBreadcrumbs, history } = params;
  const { http, notifications, getStartServices } = coreSetup;
  const startServices = await getStartServices();
  const [core, plugins] = startServices;
  const { application, chrome, docLinks, i18n, overlays, theme, savedObjects, uiSettings } = core;
  const { data, share, spaces, triggersActionsUi } = plugins;
  const { docTitle } = chrome;

  // Initialize services
  textService.init();
  docTitleService.init(docTitle.change);
  breadcrumbService.setup(setBreadcrumbs);

  // AppCore/AppPlugins to be passed on as React context
  const appDependencies: AppDependencies = {
    application,
    chrome,
    data,
    docLinks,
    http,
    i18n,
    notifications,
    overlays,
    theme,
    savedObjects,
    storage: localStorage,
    uiSettings,
    history,
    savedObjectsPlugin: plugins.savedObjects,
    share,
    spaces,
    ml: await getMlSharedImports(),
    triggersActionsUi,
  };

  const unmountAppCallback = renderApp(element, appDependencies);

  return () => {
    docTitle.reset();
    unmountAppCallback();
  };
}
