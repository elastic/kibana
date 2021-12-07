/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { CoreSetup, CoreStart, AppUpdater } from '../../../../../../src/core/public';
import { CanvasSetupDeps, CanvasStartDeps } from '../../plugin';
import { searchServiceFactory } from './search';

export type { SearchService } from './search';
export { ExpressionsService } from '../../../../../../src/plugins/expressions/common';
export * from './context';

export type CanvasServiceFactory<Service> = (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  canvasSetupPlugins: CanvasSetupDeps,
  canvasStartPlugins: CanvasStartDeps,
  appUpdater: BehaviorSubject<AppUpdater>
) => Service | Promise<Service>;

export class CanvasServiceProvider<Service> {
  private factory: CanvasServiceFactory<Service>;
  private service: Service | undefined;

  constructor(factory: CanvasServiceFactory<Service>) {
    this.factory = factory;
  }

  setService(service: Service) {
    this.service = service;
  }

  async start(
    coreSetup: CoreSetup,
    coreStart: CoreStart,
    canvasSetupPlugins: CanvasSetupDeps,
    canvasStartPlugins: CanvasStartDeps,
    appUpdater: BehaviorSubject<AppUpdater>
  ) {
    this.service = await this.factory(
      coreSetup,
      coreStart,
      canvasSetupPlugins,
      canvasStartPlugins,
      appUpdater
    );
  }

  getService(): Service {
    if (!this.service) {
      throw new Error('Service not ready');
    }

    return this.service;
  }

  stop() {
    this.service = undefined;
  }
}

export type ServiceFromProvider<P> = P extends CanvasServiceProvider<infer T> ? T : never;

export const services = {
  search: new CanvasServiceProvider(searchServiceFactory),
};

export type CanvasServiceProviders = typeof services;

export interface CanvasServices {
  search: ServiceFromProvider<typeof services.search>;
}

export const startLegacyServices = async (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  canvasSetupPlugins: CanvasSetupDeps,
  canvasStartPlugins: CanvasStartDeps,
  appUpdater: BehaviorSubject<AppUpdater>
) => {
  const startPromises = Object.values(services).map((provider) =>
    provider.start(coreSetup, coreStart, canvasSetupPlugins, canvasStartPlugins, appUpdater)
  );

  await Promise.all(startPromises);
};

export const stopServices = () => {
  Object.values(services).forEach((provider) => provider.stop());
};

export const { search: searchService } = services;
