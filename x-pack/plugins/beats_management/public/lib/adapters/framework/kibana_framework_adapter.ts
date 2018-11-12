/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IScope } from 'angular';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { BufferedKibanaServiceCall, KibanaAdapterServiceRefs, KibanaUIConfig } from '../../types';
import { FrameworkAdapter, FrameworkInfo, FrameworkUser } from './adapter_types';

export class KibanaFrameworkAdapter implements FrameworkAdapter {
  private xpackInfo: FrameworkInfo | null = null;
  private adapterService: KibanaAdapterServiceProvider;
  private rootComponent: React.ReactElement<any> | null = null;
  private uiModule: IModule;
  private routes: any;
  private XPackInfoProvider: any;
  private chrome: any;
  private shieldUser: any;

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

  public get info() {
    if (this.xpackInfo) {
      return this.xpackInfo;
    } else {
      throw new Error('framework adapter must have renderUIAtPath called before anything else');
    }
  }

  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  public get currentUser() {
    return this.shieldUser!;
  }

  public licenseExpired() {
    if (!this.xpackInfo) {
      return false;
    }
    return this.xpackInfo.get('features.beats_management.licenseExpired', false);
  }

  public securityEnabled() {
    if (!this.xpackInfo) {
      return false;
    }

    return this.xpackInfo.get('features.beats_management.securityEnabled', false);
  }

  public getDefaultUserRoles() {
    if (!this.xpackInfo) {
      return [];
    }

    return this.xpackInfo.get('features.beats_management.defaultUserRoles');
  }

  public getCurrentUser() {
    try {
      return this.shieldUser;
    } catch (e) {
      return null;
    }
  }

  public registerManagementSection(pluginId: string, displayName: string, basePath: string) {
    this.register(this.uiModule);

    this.hookAngular(() => {
      if (this.hasValidLicense()) {
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
      }
    });
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
    this.chrome.dangerouslyGetActiveInjector().then(async ($injector: any) => {
      const Private = $injector.get('Private');
      const xpackInfo = Private(this.XPackInfoProvider);

      this.xpackInfo = xpackInfo;
      if (this.securityEnabled()) {
        try {
<<<<<<< HEAD
          this.shieldUser = await $injector.get('ShieldUser').getCurrent().$promise;
=======
          this.xpackInfo = {
            basePath: this.chrome.getBasePath(),
            license: {
              type: xpackInfo.getLicense().type,
              expired: !xpackInfo.getLicense().isActive,
              expiry_date_in_millis: xpackInfo.getLicense().expiryDateInMillis,
            },
            security: {
              enabled: xpackInfo.get(`features.${this.PLUGIN_ID}.security.enabled`, false),
              available: xpackInfo.get(`features.${this.PLUGIN_ID}.security.available`, false),
            },
          };
>>>>>>> d4729fb684... wip
        } catch (e) {
          // errors when security disabled, even though we check first because angular
        }
      }

      done();
    });
  }

  private register = (adapterModule: IModule) => {
    const adapter = this;
    this.routes.when(
      `${path}${[...Array(50)].map(n => `/:arg${n}?`).join('')}`, // Hack because angular 1 does not support wildcards
      {
        template: `<${this.PLUGIN_ID.replace('_', '-')}><div id="${this.PLUGIN_ID.replace(
          '_',
          ''
        )}ReactRoot" style="flex-grow: 1; height: 100vh; background: #f5f5f5"></div></${this.PLUGIN_ID.replace(
          '_',
          '-'
        )}>`,
        controllerAs: this.PLUGIN_ID.replace('_', ''),
        // tslint:disable-next-line: max-classes-per-file
        controller: class KibanaFrameworkAdapterController {
          constructor($scope: any, $route: any) {
            $scope.$$postDigest(() => {
              const elem = document.getElementById(
                adapter.PLUGIN_ID.replace('_', '') + 'ReactRoot'
              );
              ReactDOM.render(adapter.rootComponent as React.ReactElement<any>, elem);
              adapter.manageAngularLifecycle($scope, $route, elem);
            });
            $scope.$onInit = () => {
              $scope.topNavMenu = [];
            };
          }
        },
      }
    );
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
