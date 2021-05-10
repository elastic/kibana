/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { apiService } from './api/utils';

class KibanaService {
  private static instance: KibanaService;
  private _core!: CoreSetup;

  public get core() {
    return this._core;
  }

  public set core(coreSetup: CoreSetup) {
    this._core = coreSetup;
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
