/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import angular from 'angular';
import { Observable } from 'rxjs';
import { HttpRequestInit } from '../../../../src/core/public';
import { MonitoringPluginDependencies } from './types';

interface BreadcrumbItem {
  ['data-test-subj']?: string;
  href?: string;
  text: string;
}

export interface KFetchQuery {
  [key: string]: string | number | boolean | undefined;
}

export interface KFetchOptions extends HttpRequestInit {
  pathname: string;
  query?: KFetchQuery;
  asSystemRequest?: boolean;
}

export interface KFetchKibanaOptions {
  prependBasePath?: boolean;
}

export interface IShims {
  toastNotifications: CoreStart['notifications']['toasts'];
  capabilities: { get: () => CoreStart['application']['capabilities'] };
  getAngularInjector: () => angular.auto.IInjectorService;
  getBasePath: () => string;
  getInjected: (name: string, defaultValue?: unknown) => unknown;
  breadcrumbs: {
    set: (breadcrumbs: BreadcrumbItem[]) => void;
    update: (breadcrumbs?: BreadcrumbItem[]) => void;
  };
  I18nContext: CoreStart['i18n']['Context'];
  docLinks: CoreStart['docLinks'];
  docTitle: CoreStart['chrome']['docTitle'];
  timefilter: MonitoringPluginDependencies['data']['query']['timefilter']['timefilter'];
  kfetch: (
    { pathname, ...options }: KFetchOptions,
    kfetchOptions?: KFetchKibanaOptions | undefined
  ) => Promise<any>;
  isCloud: boolean;
}

export class Legacy {
  private static _shims: IShims;

  public static init(
    { core, data, isCloud }: MonitoringPluginDependencies,
    ngInjector: angular.auto.IInjectorService
  ) {
    this._shims = {
      toastNotifications: core.notifications.toasts,
      capabilities: { get: () => core.application.capabilities },
      getAngularInjector: (): angular.auto.IInjectorService => ngInjector,
      getBasePath: (): string => core.http.basePath.get(),
      getInjected: (name: string, defaultValue?: unknown): string | unknown =>
        core.injectedMetadata.getInjectedVar(name, defaultValue),
      breadcrumbs: {
        set: (breadcrumbs: BreadcrumbItem[]) => this._shims.breadcrumbs.update(breadcrumbs),
        update: (breadcrumbs?: BreadcrumbItem[]) => {
          if (!breadcrumbs) {
            const currentBreadcrumbs: Observable<any> & {
              value?: BreadcrumbItem[];
            } = core.chrome.getBreadcrumbs$()?.source;
            breadcrumbs = currentBreadcrumbs?.value;
          }
          const globalStateStr = location.hash.split('?')[1];
          if (
            !breadcrumbs?.length ||
            globalStateStr?.indexOf('_g') !== 0 ||
            breadcrumbs[0].href?.split('?')[1] === globalStateStr
          ) {
            return;
          }
          breadcrumbs.forEach((breadcrumb: BreadcrumbItem) => {
            const breadcrumbHref = breadcrumb.href?.split('?')[0];
            if (breadcrumbHref) {
              breadcrumb.href = `${breadcrumbHref}?${globalStateStr}`;
            }
          });
          core.chrome.setBreadcrumbs(breadcrumbs.slice(0));
        },
      },
      I18nContext: core.i18n.Context,
      docLinks: core.docLinks,
      docTitle: core.chrome.docTitle,
      timefilter: data.query.timefilter.timefilter,
      kfetch: async (
        { pathname, ...options }: KFetchOptions,
        kfetchOptions?: KFetchKibanaOptions
      ) =>
        await core.http.fetch(pathname, {
          prependBasePath: kfetchOptions?.prependBasePath,
          ...options,
        }),
      isCloud,
    };
  }

  public static get shims(): Readonly<IShims> {
    if (!Legacy._shims) {
      throw new Error('Legacy needs to be initiated with Legacy.init(...) before use');
    }
    return Legacy._shims;
  }
}
