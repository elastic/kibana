/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { CoreSetup, CoreStart, AppUpdater } from '../../../../../../src/core/public';
import { CanvasSetupDeps, CanvasStartDeps } from '../../plugin';
import { navLinkServiceFactory } from './nav_link';
import { embeddablesServiceFactory } from './embeddables';
import { expressionsServiceFactory } from './expressions';
import { searchServiceFactory } from './search';
import { labsServiceFactory } from './labs';
import { reportingServiceFactory } from './reporting';

export { SearchService } from './search';
export { NavLinkService } from './nav_link';
export { EmbeddablesService } from './embeddables';
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
  embeddables: new CanvasServiceProvider(embeddablesServiceFactory),
  expressions: new CanvasServiceProvider(expressionsServiceFactory),
  navLink: new CanvasServiceProvider(navLinkServiceFactory),
  search: new CanvasServiceProvider(searchServiceFactory),
  reporting: new CanvasServiceProvider(reportingServiceFactory),
  labs: new CanvasServiceProvider(labsServiceFactory),
};

export type CanvasServiceProviders = typeof services;

export interface CanvasServices {
  embeddables: ServiceFromProvider<typeof services.embeddables>;
  expressions: ServiceFromProvider<typeof services.expressions>;
  navLink: ServiceFromProvider<typeof services.navLink>;
  search: ServiceFromProvider<typeof services.search>;
  reporting: ServiceFromProvider<typeof services.reporting>;
  labs: ServiceFromProvider<typeof services.labs>;
}

export const startServices = async (
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

export const {
  embeddables: embeddableService,
  navLink: navLinkService,
  expressions: expressionsService,
  search: searchService,
  reporting: reportingService,
} = services;
