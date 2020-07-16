/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { apiService } from './api/utils';

class KibanaService {
  private static instance: KibanaService;
  private _core!: CoreStart;

  public get core() {
    return this._core;
  }

  public set core(coreStart: CoreStart) {
    this._core = coreStart;
    apiService.http = this._core.http;
  }

  public get toasts() {
    return this._core.notifications.toasts;
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
