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
  Chrome,
  FrameworkAdapter,
  KibanaAdapterServiceRefs,
  KibanaUIConfig,
  UiKibanaAdapterScope,
} from '../../lib';

const ROOT_ELEMENT_ID = 'react-beats-cm-root';

export class KibanaFrameworkAdapter implements FrameworkAdapter {
  public appState: object;
  public kbnVersion?: string;

  private management: any;
  private adapterService: KibanaAdapterServiceProvider;
  private rootComponent: React.ReactElement<any> | null = null;
  private uiModule: IModule;

  constructor(uiModule: IModule, management: any) {
    this.adapterService = new KibanaAdapterServiceProvider();
    this.management = management;
    this.uiModule = uiModule;
    this.appState = {};
  }

  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  public render = (component: React.ReactElement<any>) => {
    this.adapterService.callOrBuffer(() => (this.rootComponent = component));
  };

  public registerManagementSection(pluginId: string, displayName: string, basePath: string) {
    const registerSection = () =>
      this.management.register(pluginId, {
        display: displayName,
        order: 30,
      });
    const getSection = () => this.management.getSection(pluginId);

    const section = this.management.hasItem(pluginId) ? getSection() : registerSection();

    section.register(pluginId, {
      visible: true,
      display: displayName,
      order: 30,
      url: `#/${basePath}`,
    });

    this.register(this.uiModule);
  }

  private register = (adapterModule: IModule) => {
    adapterModule.provider('kibanaAdapter', this.adapterService);

    adapterModule.directive('beatsCMKibanaAdapter', () => ({
      controller: ($scope: UiKibanaAdapterScope, $element: JQLite) => ({
        $onDestroy: () => {
          const targetRootElement = $element[0].querySelector(`#${ROOT_ELEMENT_ID}`);

          if (targetRootElement) {
            ReactDOM.unmountComponentAtNode(targetRootElement);
          }
        },
        $onInit: () => {
          $scope.topNavMenu = [];
        },
        $postLink: () => {
          $scope.$watchGroup([], ([targetElement]) => {
            if (!targetElement) {
              return;
            }

            ReactDOM.unmountComponentAtNode(targetElement);
          });
          $scope.$watchGroup(
            [() => this.rootComponent, () => $element[0].querySelector(`#${ROOT_ELEMENT_ID}`)],
            ([rootComponent, targetElement]) => {
              if (!targetElement) {
                return;
              }

              if (rootComponent) {
                ReactDOM.render(rootComponent, targetElement);
              } else {
                ReactDOM.unmountComponentAtNode(targetElement);
              }
            }
          );
        },
      }),
      scope: true,
      template: `
        <div
          id="${ROOT_ELEMENT_ID}"
          style="display: flex; flex-direction: column; align-items: stretch; flex: 1 0 0; overflow: hidden;"
        ></div>
      `,
    }));

    adapterModule.run((
      chrome: Chrome,
      config: KibanaUIConfig,
      kbnVersion: string,
      Private: <Provider>(provider: Provider) => Provider,
      // @ts-ignore: inject kibanaAdapter to force eager instatiation
      kibanaAdapter: any
    ) => {
      this.kbnVersion = kbnVersion;

      chrome.setRootTemplate(
        '<beats-cm-ui-kibana-adapter style="display: flex; align-items: stretch; flex: 1 0 0;"></beats-cm-ui-kibana-adapter>'
      );
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
