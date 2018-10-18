/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IScope } from 'angular';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {
  BufferedKibanaServiceCall,
  FrameworkAdapter,
  KibanaAdapterServiceRefs,
  KibanaUIConfig,
} from '../../lib';

export class KibanaFrameworkAdapter implements FrameworkAdapter {
  public appState: object;

  private management: any;
  private adapterService: KibanaAdapterServiceProvider;
  private rootComponent: React.ReactElement<any> | null = null;
  private uiModule: IModule;
  private routes: any;
  private XPackInfoProvider: any;
  private xpackInfo: null | any;
  private chrome: any;

  constructor(
    uiModule: IModule,
    management: any,
    routes: any,
    chrome: any,
    XPackInfoProvider: any
  ) {
    this.adapterService = new KibanaAdapterServiceProvider();
    this.management = management;
    this.uiModule = uiModule;
    this.routes = routes;
    this.chrome = chrome;
    this.XPackInfoProvider = XPackInfoProvider;
    this.appState = {};
  }

  public get baseURLPath(): string {
    return this.chrome.getBasePath();
  }

  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  public render = (component: React.ReactElement<any>) => {
    if (this.hadValidLicense() && this.securityEnabled()) {
      this.rootComponent = component;
    }
  };

  public hadValidLicense() {
    if (!this.xpackInfo) {
      return false;
    }
    return this.xpackInfo.get('features.beats_management.licenseValid', false);
  }

  public securityEnabled() {
    if (!this.xpackInfo) {
      return false;
    }

    return this.xpackInfo.get('features.beats_management.securityEnabled', false);
  }

  public registerManagementSection(pluginId: string, displayName: string, basePath: string) {
    if (this.hadValidLicense() && this.securityEnabled()) {
      this.register(this.uiModule);

      this.hookAngular(() => {
        const registerSection = () =>
          this.management.register(pluginId, {
            display: 'Beats', // TODO these need to be config options not hard coded in the adapter
            icon: 'logoBeats',
            order: 30,
          });
        const getSection = () => this.management.getSection(pluginId);

        const section = this.management.hasItem(pluginId) ? getSection() : registerSection();

        section.register(pluginId, {
          visible: true,
          display: displayName,
          order: 30,
          url: `#${basePath}`,
        });
      });
    }
  }

  private manageAngularLifecycle($scope: any, $route: any, elem: any) {
    const lastRoute = $route.current;
    const deregister = $scope.$on('$locationChangeSuccess', () => {
      const currentRoute = $route.current;
      // if templates are the same we are on the same route
      if (lastRoute.$$route.template === currentRoute.$$route.template) {
        // this prevents angular from destroying scope
        $route.current = lastRoute;
      }
    });
    $scope.$on('$destroy', () => {
      if (deregister) {
        deregister();
      }
      // manually unmount component when scope is destroyed
      if (elem) {
        ReactDOM.unmountComponentAtNode(elem);
      }
    });
  }

  private hookAngular(done: () => any) {
    this.chrome.dangerouslyGetActiveInjector().then(($injector: any) => {
      const Private = $injector.get('Private');
      const xpackInfo = Private(this.XPackInfoProvider);

      this.xpackInfo = xpackInfo;
      done();
    });
  }

  private register = (adapterModule: IModule) => {
    const adapter = this;
    this.routes.when(`/management/beats_management/:view?/:id?/:other?/:other2?`, {
      template:
        '<beats-cm><div id="beatsReactRoot" style="flex-grow: 1; height: 100vh; background: #f5f5f5"></div></beats-cm>',
      controllerAs: 'beatsManagement',
      // tslint:disable-next-line: max-classes-per-file
      controller: class BeatsManagementController {
        constructor($scope: any, $route: any) {
          $scope.$$postDigest(() => {
            const elem = document.getElementById('beatsReactRoot');
            ReactDOM.render(adapter.rootComponent as React.ReactElement<any>, elem);
            adapter.manageAngularLifecycle($scope, $route, elem);
          });
          $scope.$onInit = () => {
            $scope.topNavMenu = [];
          };
        }
      },
    });
  };
}

// tslint:disable-next-line: max-classes-per-file
class KibanaAdapterServiceProvider {
  public serviceRefs: KibanaAdapterServiceRefs | null = null;
  public bufferedCalls: Array<BufferedKibanaServiceCall<KibanaAdapterServiceRefs>> = [];

  public $get($rootScope: IScope, config: KibanaUIConfig) {
    this.serviceRefs = {
      config,
      rootScope: $rootScope,
    };

    this.applyBufferedCalls(this.bufferedCalls);

    return this;
  }

  public callOrBuffer(serviceCall: (serviceRefs: KibanaAdapterServiceRefs) => void) {
    if (this.serviceRefs !== null) {
      this.applyBufferedCalls([serviceCall]);
    } else {
      this.bufferedCalls.push(serviceCall);
    }
  }

  public applyBufferedCalls(
    bufferedCalls: Array<BufferedKibanaServiceCall<KibanaAdapterServiceRefs>>
  ) {
    if (!this.serviceRefs) {
      return;
    }

    this.serviceRefs.rootScope.$apply(() => {
      bufferedCalls.forEach(serviceCall => {
        if (!this.serviceRefs) {
          return;
        }
        return serviceCall(this.serviceRefs);
      });
    });
  }
}
