/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScope } from 'angular';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { FrameworkInfo, FrameworkUser } from './adapter_types';

import {
  BufferedKibanaServiceCall,
  FrameworkAdapter,
  KibanaAdapterServiceRefs,
  KibanaUIConfig,
} from '../../types';

export class KibanaFrameworkAdapter implements FrameworkAdapter {
  public info: FrameworkInfo | null = null;

  private adapterService: KibanaAdapterServiceProvider;
  private rootComponent: React.ReactElement<any> | null = null;
  private shieldUser: FrameworkUser | null = null;
  private hasInit: boolean = false;
  constructor(
    private readonly PLUGIN_ID: string,
    private readonly management: any,
    private readonly routes: any,
    private readonly chrome: any,
    private readonly XPackInfoProvider: any
  ) {
    this.adapterService = new KibanaAdapterServiceProvider();
  }

  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  public getCurrentUser() {
    return this.shieldUser!;
  }

  public async renderUIAtPath(path: string, component: React.ReactElement<any>) {
    this.rootComponent = component;
    this.registerPath(path);
    await this.hookAngular();
    this.hasInit = true;
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

  private async hookAngular() {
    return new Promise(resolve => {
      this.chrome.dangerouslyGetActiveInjector().then(async ($injector: any) => {
        const Private = $injector.get('Private');
        const xpackInfo = Private(this.XPackInfoProvider);

        try {
          this.info = {
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
        } catch (e) {
          throw new Error(`Unexpected data structure from XPackInfoProvider, ${JSON.stringify(e)}`);
        }

        this.shieldUser = await $injector.get('ShieldUser').getCurrent().$promise;

        resolve();
      });
    });
  }

  private registerPath = (path: string) => {
    const adapter = this;
    this.routes.when(`${path}/:view?/:id?/:other?/:other2?/:other3?/:other4?/:other5?`, {
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
            const elem = document.getElementById(adapter.PLUGIN_ID.replace('_', '') + 'ReactRoot');
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
  private runFrameworkReadyCheck() {
    if (!this.hasInit) {
      throw new Error('framework must have renderUIAtPath called before anything else');
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
