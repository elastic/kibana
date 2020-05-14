/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, ApplicationStart, HttpSetup } from 'kibana/public';
import angular from 'angular';
import { HttpRequestInit } from '../../../../src/core/public';
import { MonitoringPluginDependencies } from './types';
import { TriggersAndActionsUIPublicPluginSetup } from '../../triggers_actions_ui/public';

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
  capabilities: ApplicationStart['capabilities'];
  getAngularInjector: () => angular.auto.IInjectorService;
  getBasePath: () => string;
  getInjected: (name: string, defaultValue?: unknown) => unknown;
  breadcrumbs: { set: () => void };
  I18nContext: CoreStart['i18n']['Context'];
  docLinks: CoreStart['docLinks'];
  docTitle: CoreStart['chrome']['docTitle'];
  timefilter: MonitoringPluginDependencies['data']['query']['timefilter']['timefilter'];
  http: HttpSetup;
  kfetch: (
    { pathname, ...options }: KFetchOptions,
    kfetchOptions?: KFetchKibanaOptions | undefined
  ) => Promise<any>;
  isCloud: boolean;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

export class Legacy {
  private static _shims: IShims;

  public static init(
    { core, data, isCloud, triggersActionsUi }: MonitoringPluginDependencies,
    ngInjector: angular.auto.IInjectorService
  ) {
    this._shims = {
      toastNotifications: core.notifications.toasts,
      capabilities: core.application.capabilities,
      getAngularInjector: (): angular.auto.IInjectorService => ngInjector,
      getBasePath: (): string => core.http.basePath.get(),
      getInjected: (name: string, defaultValue?: unknown): string | unknown =>
        core.injectedMetadata.getInjectedVar(name, defaultValue),
      breadcrumbs: {
        set: (...args: any[0]) => core.chrome.setBreadcrumbs.apply(this, args),
      },
      I18nContext: core.i18n.Context,
      docLinks: core.docLinks,
      docTitle: core.chrome.docTitle,
      timefilter: data.query.timefilter.timefilter,
      http: core.http,
      kfetch: async (
        { pathname, ...options }: KFetchOptions,
        kfetchOptions?: KFetchKibanaOptions
      ) =>
        await core.http.fetch(pathname, {
          prependBasePath: kfetchOptions?.prependBasePath,
          ...options,
        }),
      isCloud,
      triggersActionsUi,
    };
  }

  public static get shims(): Readonly<IShims> {
    if (!Legacy._shims) {
      throw new Error('Legacy needs to be initiated with Legacy.init(...) before use');
    }
    return Legacy._shims;
  }
}
