/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';

import type { FleetConfigType } from '..';

/**
 * Kibana config observable service, *NOT* agent policy
 */
class ConfigService {
  private observable: Observable<FleetConfigType> | null = null;
  private subscription: Subscription | null = null;
  private config: FleetConfigType | null = null;

  private updateInformation(config: FleetConfigType) {
    this.config = config;
  }

  public start(config$: Observable<FleetConfigType>) {
    this.observable = config$;
    this.subscription = this.observable.subscribe(this.updateInformation.bind(this));
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public getConfig() {
    return this.config;
  }
}

export const configService = new ConfigService();
