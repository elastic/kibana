/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { fatalError } from 'ui/notify';

export interface AppCore {
  i18n: {
    [i18nPackage: string]: any;
    Context: typeof I18nContext;
    FormattedMessage: typeof FormattedMessage;
  };
  chrome: typeof chrome;
  notification: {
    fatalError: typeof fatalError;
  };
  http: {
    getClient(): any;
    setClient(client: any): void;
  };
  documentation: {
    esDocBasePath: string;
    esPluginDocBasePath: string;
  };
}

export interface AppPlugins {
  management: {
    sections: typeof management;
    constants: {
      BREADCRUMB: typeof MANAGEMENT_BREADCRUMB;
    };
  };
}

export interface AppDependencies {
  core: AppCore;
  plugins: AppPlugins;
}

export interface AppState {
  [key: string]: any;
}
