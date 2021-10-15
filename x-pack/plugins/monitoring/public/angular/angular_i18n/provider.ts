/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type I18nServiceType = ReturnType<I18nProvider['$get']>;

export class I18nProvider implements angular.IServiceProvider {
  public addTranslation = i18n.addTranslation;
  public getTranslation = i18n.getTranslation;
  public setLocale = i18n.setLocale;
  public getLocale = i18n.getLocale;
  public setDefaultLocale = i18n.setDefaultLocale;
  public getDefaultLocale = i18n.getDefaultLocale;
  public setFormats = i18n.setFormats;
  public getFormats = i18n.getFormats;
  public getRegisteredLocales = i18n.getRegisteredLocales;
  public init = i18n.init;
  public load = i18n.load;
  public $get = () => i18n.translate;
}
