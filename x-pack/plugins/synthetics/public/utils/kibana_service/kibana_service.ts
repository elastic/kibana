/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { CoreStart, CoreTheme, CoreSetup } from '@kbn/core/public';
import { AppMountParameters } from '@kbn/core/public';
import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';
import { apiService } from '../api_service/api_service';

class KibanaService {
  private static instance: KibanaService;
  public coreStart!: CoreStart;
  public coreSetup!: CoreSetup;
  public theme!: Observable<CoreTheme>;
  public setupPlugins!: ClientPluginsSetup;
  public isDev!: boolean;
  public appMountParameters!: AppMountParameters;
  public startPlugins!: ClientPluginsStart;

  public get core() {
    return this.coreSetup;
  }

  public init(
    coreSetup: CoreSetup,
    setupPlugins: ClientPluginsSetup,
    coreStart: CoreStart,
    startPlugins: ClientPluginsStart,
    isDev: boolean
  ) {
    this.coreSetup = coreSetup;
    this.coreStart = coreStart;
    this.startPlugins = startPlugins;
    this.theme = coreStart.uiSettings.get$('theme:darkMode');
    apiService.http = coreStart.http;
    this.isDev = isDev;
  }

  public get toasts() {
    return this.coreSetup.notifications.toasts;
  }

  private constructor() {}

  static getInstance(): KibanaService {
    if (!KibanaService.instance) {
      KibanaService.instance = new KibanaService();
    }

    return KibanaService.instance;
  }
}

export const kibanaService = KibanaService.getInstance();
