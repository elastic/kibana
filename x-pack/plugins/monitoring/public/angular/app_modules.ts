/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular, { IWindowService } from 'angular';
import '../views/all';
// required for `ngSanitize` angular module
import 'angular-sanitize';
import 'angular-route';
import '../index.scss';
import { upperFirst } from 'lodash';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import { AppMountContext } from 'kibana/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import {
  createTopNavDirective,
  createTopNavHelper,
} from '../../../../../src/plugins/kibana_legacy/public';
import { MonitoringPluginDependencies } from '../types';
import { GlobalState } from '../url_state';
import { getSafeForExternalLink } from '../lib/get_safe_for_external_link';

// @ts-ignore
import { formatNumber, formatMetric } from '../lib/format_number';
// @ts-ignore
import { extractIp } from '../lib/extract_ip';
// @ts-ignore
import { PrivateProvider } from './providers/private';
// @ts-ignore
import { breadcrumbsProvider } from '../services/breadcrumbs';
// @ts-ignore
import { monitoringClustersProvider } from '../services/clusters';
// @ts-ignore
import { executorProvider } from '../services/executor';
// @ts-ignore
import { featuresProvider } from '../services/features';
// @ts-ignore
import { licenseProvider } from '../services/license';
// @ts-ignore
import { titleProvider } from '../services/title';
// @ts-ignore
import { monitoringBeatsBeatProvider } from '../directives/beats/beat';
// @ts-ignore
import { monitoringBeatsOverviewProvider } from '../directives/beats/overview';
// @ts-ignore
import { monitoringMlListingProvider } from '../directives/elasticsearch/ml_job_listing';
// @ts-ignore
import { monitoringMainProvider } from '../directives/main';

export const appModuleName = 'monitoring';

type IPrivate = <T>(provider: (...injectable: unknown[]) => T) => T;

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react', 'ui.bootstrap'];

export const localAppModule = ({
  core,
  data: { query },
  navigation,
  externalConfig,
}: MonitoringPluginDependencies) => {
  createLocalI18nModule();
  createLocalPrivateModule();
  createLocalStorage();
  createLocalConfigModule(core);
  createLocalStateModule(query);
  createLocalTopNavModule(navigation);
  createHrefModule(core);
  createMonitoringAppServices();
  createMonitoringAppDirectives();
  createMonitoringAppConfigConstants(externalConfig);
  createMonitoringAppFilters();

  const appModule = angular.module(appModuleName, [
    ...thirdPartyAngularDependencies,
    'monitoring/I18n',
    'monitoring/Private',
    'monitoring/Storage',
    'monitoring/Config',
    'monitoring/State',
    'monitoring/TopNav',
    'monitoring/href',
    'monitoring/constants',
    'monitoring/services',
    'monitoring/filters',
    'monitoring/directives',
  ]);
  return appModule;
};

function createMonitoringAppConfigConstants(keys: MonitoringPluginDependencies['externalConfig']) {
  let constantsModule = angular.module('monitoring/constants', []);
  keys.map(([key, value]) => (constantsModule = constantsModule.constant(key as string, value)));
}

function createLocalStateModule(query: any) {
  angular
    .module('monitoring/State', ['monitoring/Private'])
    .service('globalState', function (
      Private: IPrivate,
      $rootScope: ng.IRootScopeService,
      $location: ng.ILocationService
    ) {
      function GlobalStateProvider(this: any) {
        const state = new GlobalState(query, $rootScope, $location, this);
        const initialState: any = state.getState();
        for (const key in initialState) {
          if (!initialState.hasOwnProperty(key)) {
            continue;
          }
          this[key] = initialState[key];
        }
        this.save = () => {
          const newState = { ...this };
          delete newState.save;
          state.setState(newState);
        };
      }
      return Private(GlobalStateProvider);
    });
}

function createMonitoringAppServices() {
  angular
    .module('monitoring/services', ['monitoring/Private'])
    .service('breadcrumbs', function (Private: IPrivate) {
      return Private(breadcrumbsProvider);
    })
    .service('monitoringClusters', function (Private: IPrivate) {
      return Private(monitoringClustersProvider);
    })
    .service('$executor', function (Private: IPrivate) {
      return Private(executorProvider);
    })
    .service('features', function (Private: IPrivate) {
      return Private(featuresProvider);
    })
    .service('license', function (Private: IPrivate) {
      return Private(licenseProvider);
    })
    .service('title', function (Private: IPrivate) {
      return Private(titleProvider);
    });
}

function createMonitoringAppDirectives() {
  angular
    .module('monitoring/directives', [])
    .directive('monitoringBeatsBeat', monitoringBeatsBeatProvider)
    .directive('monitoringBeatsOverview', monitoringBeatsOverviewProvider)
    .directive('monitoringMlListing', monitoringMlListingProvider)
    .directive('monitoringMain', monitoringMainProvider);
}

function createMonitoringAppFilters() {
  angular
    .module('monitoring/filters', [])
    .filter('capitalize', function () {
      return function (input: string) {
        return upperFirst(input?.toLowerCase());
      };
    })
    .filter('formatNumber', function () {
      return formatNumber;
    })
    .filter('formatMetric', function () {
      return formatMetric;
    })
    .filter('extractIp', function () {
      return extractIp;
    });
}

function createLocalConfigModule(core: MonitoringPluginDependencies['core']) {
  angular.module('monitoring/Config', []).provider('config', function () {
    return {
      $get: () => ({
        get: (key: string) => core.uiSettings?.get(key),
      }),
    };
  });
}

function createLocalStorage() {
  angular
    .module('monitoring/Storage', [])
    .service('localStorage', function ($window: IWindowService) {
      return new Storage($window.localStorage);
    })
    .service('sessionStorage', function ($window: IWindowService) {
      return new Storage($window.sessionStorage);
    })
    .service('sessionTimeout', function () {
      return {};
    });
}

function createLocalPrivateModule() {
  angular.module('monitoring/Private', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule({ ui }: MonitoringPluginDependencies['navigation']) {
  angular
    .module('monitoring/TopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(ui));
}

function createLocalI18nModule() {
  angular
    .module('monitoring/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}

function createHrefModule(core: AppMountContext['core']) {
  const name: string = 'kbnHref';
  angular.module('monitoring/href', []).directive(name, function () {
    return {
      restrict: 'A',
      link: {
        pre: (_$scope, _$el, $attr) => {
          $attr.$observe(name, (val) => {
            if (val) {
              const url = getSafeForExternalLink(val as string);
              $attr.$set('href', core.http.basePath.prepend(url));
            }
          });
        },
      },
    };
  });
}
