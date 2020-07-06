/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// inner angular imports
// these are necessary to bootstrap the local angular.
// They can stay even after NP cutover
import angular from 'angular';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import '../../../../webpackShims/ace';
// required for i18nIdDirective and `ngSanitize` angular module
import 'angular-sanitize';
// required for ngRoute
import 'angular-route';
// type imports
import {
  AppMountContext,
  ChromeStart,
  CoreStart,
  PluginInitializerContext,
  SavedObjectsClientContract,
  ToastsStart,
  OverlayStart,
} from 'kibana/public';
// @ts-ignore
import { initGraphApp } from './app';
import { Plugin as DataPlugin, IndexPatternsContract } from '../../../../src/plugins/data/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { checkLicense } from '../common/check_license';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../src/plugins/navigation/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import {
  configureAppAngularModule,
  createTopNavDirective,
  createTopNavHelper,
  KibanaLegacyStart,
} from '../../../../src/plugins/kibana_legacy/public';

import './index.scss';
import { SavedObjectsStart } from '../../../../src/plugins/saved_objects/public';

/**
 * These are dependencies of the Graph app besides the base dependencies
 * provided by the application service. Some of those still rely on non-shimmed
 * plugins in LP-world, but if they are migrated only the import path in the plugin
 * itself changes
 */
export interface GraphDependencies {
  pluginInitializerContext: PluginInitializerContext;
  core: CoreStart;
  element: HTMLElement;
  appBasePath: string;
  capabilities: Record<string, boolean | Record<string, boolean>>;
  coreStart: AppMountContext['core'];
  navigation: NavigationStart;
  licensing: LicensingPluginSetup;
  chrome: ChromeStart;
  toastNotifications: ToastsStart;
  indexPatterns: IndexPatternsContract;
  data: ReturnType<DataPlugin['start']>;
  savedObjectsClient: SavedObjectsClientContract;
  addBasePath: (url: string) => string;
  getBasePath: () => string;
  storage: Storage;
  canEditDrillDownUrls: boolean;
  graphSavePolicy: string;
  overlays: OverlayStart;
  savedObjects: SavedObjectsStart;
  kibanaLegacy: KibanaLegacyStart;
}

export const renderApp = ({ appBasePath, element, kibanaLegacy, ...deps }: GraphDependencies) => {
  kibanaLegacy.loadFontAwesome();
  const graphAngularModule = createLocalAngularModule(deps.navigation);
  configureAppAngularModule(
    graphAngularModule,
    { core: deps.core, env: deps.pluginInitializerContext.env },
    true
  );

  const licenseSubscription = deps.licensing.license$.subscribe((license) => {
    const info = checkLicense(license);
    const licenseAllowsToShowThisPage = info.showAppLink && info.enableAppLink;

    if (!licenseAllowsToShowThisPage) {
      deps.coreStart.notifications.toasts.addDanger(info.message);
      // This has to happen in the next tick because otherwise the original navigation
      // bringing us to the graph app in the first place
      // never completes and the browser enters are redirect loop
      setTimeout(() => {
        deps.coreStart.application.navigateToApp('home');
      }, 0);
    }
  });

  initGraphApp(graphAngularModule, deps);
  const $injector = mountGraphApp(appBasePath, element);
  return () => {
    licenseSubscription.unsubscribe();
    $injector.get('$rootScope').$destroy();
  };
};

const mainTemplate = (basePath: string) => `<div ng-view class="gphAppWrapper">
  <base href="${basePath}" />
</div>
`;

const moduleName = 'app/graph';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react', 'ui.bootstrap', 'ui.ace'];

function mountGraphApp(appBasePath: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('class', 'gphAppWrapper');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  element.appendChild(mountpoint);
  element.setAttribute('class', 'gphAppWrapper');
  return $injector;
}

function createLocalAngularModule(navigation: NavigationStart) {
  createLocalI18nModule();
  createLocalTopNavModule(navigation);

  const graphAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'graphI18n',
    'graphTopNav',
  ]);
  return graphAngularModule;
}

function createLocalTopNavModule(navigation: NavigationStart) {
  angular
    .module('graphTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
}

function createLocalI18nModule() {
  angular
    .module('graphI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
