/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IScope } from 'angular';
import { AxiosRequestConfig } from 'axios';
import React from 'react';
import { CMTokensAdapter } from './adapters/tokens/adapter_types';
import { BeatsLib } from './beats';
import { ElasticsearchLib } from './elasticsearch';
import { TagsLib } from './tags';

export interface FrontendDomainLibs {
  beats: BeatsLib;
  tags: TagsLib;
  tokens: CMTokensAdapter;
}

export interface FrontendLibs extends FrontendDomainLibs {
  elasticsearch: ElasticsearchLib;
  framework: FrameworkAdapter;
}

export interface YamlConfigSchema {
  id: string;
  ui: {
    label: string;
    type: 'input' | 'multi-input' | 'select' | 'code' | 'password';
    helpText?: string;
    placeholder?: string;
  };
  options?: Array<{ value: string; text: string }>;
  validations?: 'isHosts' | 'isString' | 'isPeriod' | 'isPath' | 'isPaths' | 'isYaml';
  error: string;
  defaultValue?: string;
  required?: boolean;
  parseValidResult?: (value: any) => any;
}

export interface FrameworkAdapter {
  // Instance vars
  appState?: object;
  kbnVersion?: string;
  baseURLPath: string;
  registerManagementSection(pluginId: string, displayName: string, basePath: string): void;
  // Methods
  getCurrentUser(): {
    email: string | null;
    enabled: boolean;
    full_name: string | null;
    metadata: { _reserved: true };
    roles: string[];
    scope: string[];
    username: string;
  };
  setUISettings(key: string, value: any): void;
  render(component: React.ReactElement<any>): void;
}

export interface FramworkAdapterConstructable {
  new (uiModule: IModule): FrameworkAdapter;
}

// TODO: replace AxiosRequestConfig with something more defined
export type RequestConfig = AxiosRequestConfig;

export interface ApiAdapter {
  kbnVersion: string;

  get<T>(url: string, config?: RequestConfig | undefined): Promise<T>;
  post(url: string, data?: any, config?: AxiosRequestConfig | undefined): Promise<object>;
  delete(url: string, config?: RequestConfig | undefined): Promise<object>;
  put(url: string, data?: any, config?: RequestConfig | undefined): Promise<object>;
}

export interface UiKibanaAdapterScope extends IScope {
  breadcrumbs: any[];
  topNavMenu: any[];
}

export interface KibanaUIConfig {
  get(key: string): any;
  set(key: string, value: any): Promise<boolean>;
}

export interface KibanaAdapterServiceRefs {
  config: KibanaUIConfig;
  rootScope: IScope;
}

export type BufferedKibanaServiceCall<ServiceRefs> = (serviceRefs: ServiceRefs) => void;

export interface Chrome {
  setRootTemplate(template: string): void;
}
