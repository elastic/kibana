/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, HttpSetup, IUiSettingsClient } from 'kibana/public';
import angular from 'angular';
import { Observable } from 'rxjs';
import { HttpRequestInit } from '../../../../src/core/public';
import { MonitoringStartPluginDependencies } from './types';
import { TriggersAndActionsUIPublicPluginSetup } from '../../triggers_actions_ui/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TypeRegistry } from '../../triggers_actions_ui/public/application/type_registry';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionTypeModel, AlertTypeModel } from '../../triggers_actions_ui/public/types';

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
  capabilities: CoreStart['application']['capabilities'];
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
  timefilter: MonitoringStartPluginDependencies['data']['query']['timefilter']['timefilter'];
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  uiSettings: IUiSettingsClient;
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
    { core, data, isCloud, triggersActionsUi }: MonitoringStartPluginDependencies,
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
      actionTypeRegistry: triggersActionsUi?.actionTypeRegistry,
      alertTypeRegistry: triggersActionsUi?.alertTypeRegistry,
      uiSettings: core.uiSettings,
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
