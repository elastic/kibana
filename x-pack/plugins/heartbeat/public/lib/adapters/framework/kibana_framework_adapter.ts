/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IScope } from 'angular';
import ReactDOM from 'react-dom';
import { HeartbeatFrameworkAdapter } from '../../lib';

export class HeartbeatKibanaFrameworkAdapter implements HeartbeatFrameworkAdapter {
  private adapterService: KibanaAdapterServiceProvider;
  private adapterModule: IModule;
  private uiRoutes: any;

  constructor(uiModule: IModule, uiRoutes: any) {
    this.adapterService = new KibanaAdapterServiceProvider();
    this.adapterModule = uiModule;
    this.uiRoutes = uiRoutes;
  }

  public render = (component: React.ReactElement<any>) => {
    this.register(this.adapterModule, this.uiRoutes, component);
  };

  private register = (
    adapterModule: IModule,
    uiRoutes: any,
    rootComponent: React.ReactElement<any>
  ) => {
    adapterModule.provider('kibanaAdapter', this.adapterService);
    uiRoutes.enable();
    uiRoutes.when('/home', {
      // @ts-ignore
      controllerAs: 'heartbeat',
      controller: () => {
        const elem = document.getElementById('heartbeatReactRoot');
        ReactDOM.render(rootComponent, elem);
      },
      template:
        '<div style="display: flex; align-items: stretch; flex: 1 0 0;" id="heartbeatReactRoot"></div>',
    });
  };
}

// tslint:disable-next-line: max-classes-per-file
class KibanaAdapterServiceProvider {
  public serviceRefs: any | null = null;
  public bufferedCalls: any = [];

  public $get($rootScope: IScope, config: any) {
    this.serviceRefs = {
      config,
      rootScope: $rootScope,
    };

    this.applyBufferedCalls(this.bufferedCalls);

    return this;
  }

  public callOrBuffer(serviceCall: (serviceRefs: any) => void) {
    if (this.serviceRefs !== null) {
      this.applyBufferedCalls([serviceCall]);
    } else {
      this.bufferedCalls.push(serviceCall);
    }
  }

  public applyBufferedCalls(bufferedCalls: any) {
    if (!this.serviceRefs) {
      return;
    }

    this.serviceRefs.rootScope.$apply(() => {
      bufferedCalls.forEach((serviceCall: any) => {
        if (!this.serviceRefs) {
          return;
        }
        return serviceCall(this.serviceRefs);
      });
    });
  }
}
