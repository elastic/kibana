/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScope } from 'angular';
import { PathReporter } from 'io-ts/lib/PathReporter';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { UIRoutes } from 'ui/routes';
import { BufferedKibanaServiceCall, KibanaAdapterServiceRefs, KibanaUIConfig } from '../../types';
import { FrameworkAdapter, FrameworkInfo, FrameworkUser, ManagementAPI } from './adapter_types';
import { RuntimeFrameworkInfo } from './adapter_types';

export class KibanaFrameworkAdapter implements FrameworkAdapter {
  private xpackInfo: FrameworkInfo | null = null;
  private adapterService: KibanaAdapterServiceProvider;
  private rootComponent: React.ReactElement<any> | null = null;
  private shieldUser: FrameworkUser | null = null;
  private hasInit: boolean = false;

  constructor(
    private readonly PLUGIN_ID: string,
    private readonly management: ManagementAPI,
    private readonly frameworkWhenRoute: UIRoutes['when'],
    private readonly getBasePath: () => string,
    private readonly onKibanaReady: (Private: any) => void,
    private readonly XPackInfoProvider: unknown
  ) {
    this.adapterService = new KibanaAdapterServiceProvider();
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

  public async init() {
    await this.hookAngular();
    this.hasInit = true;
  }

  public renderUIAtPath(path: string, component: React.ReactElement<any>) {
    this.rootComponent = component;
    this.registerPath(path);
  }

  public registerManagementSection(settings: {
    id?: string;
    name: string;
    iconName: string;
    order?: number;
  }) {
    this.runFrameworkReadyCheck();
    const sectionId = settings.id || this.PLUGIN_ID;

    if (!this.management.hasItem(sectionId)) {
      this.management.register(sectionId, {
        display: settings.name,
        icon: settings.iconName,
        order: settings.order || 30,
      });
    }
  }

  public registerManagementUI(settings: {
    id?: string;
    name: string;
    basePath: string;
    visable?: boolean;
    order?: number;
  }) {
    this.runFrameworkReadyCheck();
    const sectionId = settings.id || this.PLUGIN_ID;

    if (!this.management.hasItem(sectionId)) {
      throw new Error(
        `registerManagementUI was called with a sectionId of ${sectionId}, and that is is not yet regestered as a section`
      );
    }

    const section = this.management.getSection(sectionId);

    section.register(sectionId, {
      visible: settings.visable || true,
      display: settings.name,
      order: settings.order || 30,
      url: `#${settings.basePath}`,
    });
  }

  private manageAngularLifecycle($scope: any, $route: any, elem: HTMLElement) {
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

  private async hookAngular() {
    return new Promise(resolve => {
      this.onKibanaReady(async (Private: any, $injector: any) => {
        const xpackInfo = Private(this.XPackInfoProvider);
        let xpackInfoUnpacked: FrameworkInfo;
        try {
          xpackInfoUnpacked = {
            basePath: this.getBasePath(),
            license: {
              type: xpackInfo.getLicense().type,
              expired: !xpackInfo.getLicense().isActive,
              expiry_date_in_millis: xpackInfo.getLicense().expiryDateInMillis,
            },
            security: {
              enabled: xpackInfo.get(`features.${this.PLUGIN_ID}.security.enabled`, false),
              available: xpackInfo.get(`features.${this.PLUGIN_ID}.security.available`, false),
            },
            settings: xpackInfo.get(`features.${this.PLUGIN_ID}.settings`),
          };
        } catch (e) {
          throw new Error(`Unexpected data structure from XPackInfoProvider, ${JSON.stringify(e)}`);
        }

        const assertData = RuntimeFrameworkInfo.decode(xpackInfoUnpacked);
        if (assertData.isLeft()) {
          throw new Error(
            `Error parsing xpack info in ${this.PLUGIN_ID},   ${PathReporter.report(assertData)[0]}`
          );
        }
        this.xpackInfo = xpackInfoUnpacked;

        this.shieldUser = await $injector.get('ShieldUser').getCurrent().$promise;

        resolve();
      });
    });
  }

  private registerPath = (path: string) => {
    const adapter = this;
    this.frameworkWhenRoute(
      `${path}${[...Array(50)].map(n => `/:arg${n}?`).join('')}`, // Hack because angular 1 does not support wildcards
      {
        template: `<${this.PLUGIN_ID.replace('_', '-')}><div id="${this.PLUGIN_ID.replace(
          '_',
          ''
        )}ReactRoot" style="flex-grow: 1; height: 100vh; background: #f5f5f5"></div></${this.PLUGIN_ID.replace(
          '_',
          '-'
        )}>`,
        // tslint:disable-next-line: max-classes-per-file
        controller: ($scope: any, $route: any, $timeout: any) => {
          $timeout(
            () => {
              const elem = document.getElementById(
                adapter.PLUGIN_ID.replace('_', '') + 'ReactRoot'
              );
              if (!elem) {
                throw new Error(
                  `Error rendering UI for plugin ${
                    this.PLUGIN_ID
                  }, element ${adapter.PLUGIN_ID.replace('_', '') + 'ReactRoot'} could not be found`
                );
              }

              ReactDOM.render(adapter.rootComponent as React.ReactElement<any>, elem);
              adapter.manageAngularLifecycle($scope, $route, elem);
            },
            0,
            false
          );
          $scope.$onInit = () => {
            $scope.topNavMenu = [];
          };
        },
      }
    );
  };
  private runFrameworkReadyCheck() {
    if (!this.hasInit) {
      throw new Error('framework must have init called before anything else');
    }
  }
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
