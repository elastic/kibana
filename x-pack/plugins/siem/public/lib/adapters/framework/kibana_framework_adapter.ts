/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { IModule, IScope } from 'angular';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { UIRoutes as KibanaUIRoutes } from 'ui/routes';

import {
  AppBufferedKibanaServiceCall,
  AppFrameworkAdapter,
  AppKibanaAdapterServiceRefs,
  AppKibanaUIConfig,
  AppTimezoneProvider,
  AppUiKibanaAdapterScope,
} from '../../lib';

const ROOT_ELEMENT_ID = 'react-siem-root';
const BREADCRUMBS_ELEMENT_ID = 'react-siem-breadcrumbs';

export const KibanaConfigContext = React.createContext<Partial<AppKibanaFrameworkAdapter>>({});

export class AppKibanaFrameworkAdapter implements AppFrameworkAdapter {
  public bytesFormat?: string;
  public dateFormat?: string;
  public dateFormatTz?: string;
  public darkMode?: boolean;
  public kbnVersion?: string;
  public scaledDateFormat?: string;
  public timezone?: string;

  private adapterService: KibanaAdapterServiceProvider;
  private timezoneProvider: AppTimezoneProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rootComponent: React.ReactElement<any> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private breadcrumbsComponent: React.ReactElement<any> | null = null;

  constructor(uiModule: IModule, uiRoutes: KibanaUIRoutes, timezoneProvider: AppTimezoneProvider) {
    this.adapterService = new KibanaAdapterServiceProvider();
    this.timezoneProvider = timezoneProvider;
    this.register(uiModule, uiRoutes);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public render = (component: React.ReactElement<any>) => {
    this.adapterService.callOrBuffer(() => (this.rootComponent = component));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public renderBreadcrumbs = (component: React.ReactElement<any>) => {
    this.adapterService.callOrBuffer(() => (this.breadcrumbsComponent = component));
  };

  private register = (adapterModule: IModule, uiRoutes: KibanaUIRoutes) => {
    adapterModule.provider('kibanaAdapter', this.adapterService);

    adapterModule.directive('appUiKibanaAdapter', () => ({
      controller: ($scope: AppUiKibanaAdapterScope, $element: JQLite) => ({
        $onDestroy: () => {
          const targetRootElement = $element[0].querySelector(`#${ROOT_ELEMENT_ID}`);
          const targetBreadcrumbsElement = $element[0].querySelector(`#${ROOT_ELEMENT_ID}`);

          if (targetRootElement) {
            ReactDOM.unmountComponentAtNode(targetRootElement);
          }

          if (targetBreadcrumbsElement) {
            ReactDOM.unmountComponentAtNode(targetBreadcrumbsElement);
          }
        },
        $onInit: () => {
          $scope.topNavMenu = [];
        },
        $postLink: () => {
          $scope.$watchGroup(
            [
              () => this.breadcrumbsComponent,
              () => $element[0].querySelector(`#${BREADCRUMBS_ELEMENT_ID}`),
            ],
            ([breadcrumbsComponent, targetElement]) => {
              if (!targetElement) {
                return;
              }

              if (breadcrumbsComponent) {
                ReactDOM.render(breadcrumbsComponent, targetElement);
              } else {
                ReactDOM.unmountComponentAtNode(targetElement);
              }
            }
          );
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
        <div id="${ROOT_ELEMENT_ID}"></div>
      `,
    }));

    adapterModule.run((
      config: AppKibanaUIConfig,
      kbnVersion: string,
      Private: <Provider>(provider: Provider) => Provider,
      // @ts-ignore: inject kibanaAdapter to force eager installation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kibanaAdapter: any
    ) => {
      this.timezone = Private(this.timezoneProvider)();
      this.kbnVersion = kbnVersion;
      this.bytesFormat = config.get('format:bytes:defaultPattern');
      this.dateFormat = config.get('dateFormat');
      this.dateFormatTz = config.get('dateFormat:tz');
      try {
        this.darkMode = config.get('theme:darkMode');
      } catch (e) {
        this.darkMode = false;
      }
      this.scaledDateFormat = config.get('dateFormat:scaled');
    });

    uiRoutes.enable();

    uiRoutes.otherwise({
      reloadOnSearch: false,
      template: '<app-ui-kibana-adapter></app-ui-kibana-adapter>',
    });
  };
}

class KibanaAdapterServiceProvider {
  public serviceRefs: AppKibanaAdapterServiceRefs | null = null;
  public bufferedCalls: Array<AppBufferedKibanaServiceCall<AppKibanaAdapterServiceRefs>> = [];

  public $get($rootScope: IScope, config: AppKibanaUIConfig) {
    this.serviceRefs = {
      config,
      rootScope: $rootScope,
    };

    this.applyBufferedCalls(this.bufferedCalls);

    return this;
  }

  public callOrBuffer(serviceCall: (serviceRefs: AppKibanaAdapterServiceRefs) => void) {
    if (this.serviceRefs !== null) {
      this.applyBufferedCalls([serviceCall]);
    } else {
      this.bufferedCalls.push(serviceCall);
    }
  }

  public applyBufferedCalls(
    bufferedCalls: Array<AppBufferedKibanaServiceCall<AppKibanaAdapterServiceRefs>>
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
