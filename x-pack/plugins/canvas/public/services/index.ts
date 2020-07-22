/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { CoreSetup, CoreStart, AppUpdater } from '../../../../../src/core/public';
import { CanvasSetupDeps, CanvasStartDeps } from '../plugin';
import { notifyServiceFactory } from './notify';
import { platformServiceFactory } from './platform';
import { navLinkServiceFactory } from './nav_link';
import { embeddablesServiceFactory } from './embeddables';
import { expressionsServiceFactory } from './expressions';

export { NotifyService } from './notify';
export { PlatformService } from './platform';
export { NavLinkService } from './nav_link';
export { EmbeddablesService } from './embeddables';
export { ExpressionsService } from '../../../../../src/plugins/expressions/common';
export * from './context';

export type CanvasServiceFactory<Service> = (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  canvasSetupPlugins: CanvasSetupDeps,
  canvasStartPlugins: CanvasStartDeps,
  appUpdater: BehaviorSubject<AppUpdater>
) => Service | Promise<Service>;

class CanvasServiceProvider<Service> {
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
  notify: new CanvasServiceProvider(notifyServiceFactory),
  platform: new CanvasServiceProvider(platformServiceFactory),
  navLink: new CanvasServiceProvider(navLinkServiceFactory),
};

export type CanvasServiceProviders = typeof services;

export interface CanvasServices {
  embeddables: ServiceFromProvider<typeof services.embeddables>;
  expressions: ServiceFromProvider<typeof services.expressions>;
  notify: ServiceFromProvider<typeof services.notify>;
  platform: ServiceFromProvider<typeof services.platform>;
  navLink: ServiceFromProvider<typeof services.navLink>;
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
  notify: notifyService,
  platform: platformService,
  navLink: navLinkService,
  expressions: expressionsService,
} = services;
