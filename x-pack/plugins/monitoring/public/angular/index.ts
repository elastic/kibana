/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular, { IModule } from 'angular';
import { uiRoutes } from './helpers/routes';
import { Legacy } from '../legacy_shims';
import { configureAppAngularModule } from '../../../../../src/plugins/kibana_legacy/public';
import { localAppModule, appModuleName } from './app_modules';

import { MonitoringStartPluginDependencies } from '../types';

const APP_WRAPPER_CLASS = 'monApplicationWrapper';
export class AngularApp {
  private injector?: angular.auto.IInjectorService;

  constructor(deps: MonitoringStartPluginDependencies) {
    const {
      core,
      element,
      data,
      navigation,
      isCloud,
      pluginInitializerContext,
      externalConfig,
      triggersActionsUi,
      kibanaLegacy,
    } = deps;
    const app: IModule = localAppModule(deps);
    app.run(($injector: angular.auto.IInjectorService) => {
      this.injector = $injector;
      Legacy.init(
        {
          core,
          element,
          data,
          navigation,
          isCloud,
          pluginInitializerContext,
          externalConfig,
          kibanaLegacy,
          triggersActionsUi,
        },
        this.injector
      );
    });

    app.config(($routeProvider: unknown) => uiRoutes.addToProvider($routeProvider));

    const np = { core, env: pluginInitializerContext.env };
    configureAppAngularModule(app, np, true);
    const appElement = document.createElement('div');
    appElement.setAttribute('style', 'height: 100%');
    appElement.innerHTML = '<div ng-view style="height: 100%" id="monitoring-angular-app"></div>';

    if (!element.classList.contains(APP_WRAPPER_CLASS)) {
      element.classList.add(APP_WRAPPER_CLASS);
    }

    angular.bootstrap(appElement, [appModuleName]);
    angular.element(element).append(appElement);
  }

  public destroy = () => {
    if (this.injector) {
      this.injector.get('$rootScope').$destroy();
    }
  };

  public applyScope = () => {
    if (!this.injector) {
      return;
    }

    const rootScope = this.injector.get('$rootScope');
    rootScope.$applyAsync();
  };
}
