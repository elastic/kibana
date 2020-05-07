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

export type CanvasServiceFactory<Service> = (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  canvasSetupPlugins: CanvasSetupDeps,
  canvasStartPlugins: CanvasStartDeps,
  appUpdater: BehaviorSubject<AppUpdater>
) => Service;

class CanvasServiceProvider<Service> {
  private factory: CanvasServiceFactory<Service>;
  private service: Service | undefined;

  constructor(factory: CanvasServiceFactory<Service>) {
    this.factory = factory;
  }

  start(
    coreSetup: CoreSetup,
    coreStart: CoreStart,
    canvasSetupPlugins: CanvasSetupDeps,
    canvasStartPlugins: CanvasStartDeps,
    appUpdater: BehaviorSubject<AppUpdater>
  ) {
    this.service = this.factory(
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
  notify: new CanvasServiceProvider(notifyServiceFactory),
  platform: new CanvasServiceProvider(platformServiceFactory),
  navLink: new CanvasServiceProvider(navLinkServiceFactory),
};

export interface CanvasServices {
  notify: ServiceFromProvider<typeof services.notify>;
  platform: ServiceFromProvider<typeof services.platform>;
  navLink: ServiceFromProvider<typeof services.navLink>;
}

export const startServices = (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  canvasSetupPlugins: CanvasSetupDeps,
  canvasStartPlugins: CanvasStartDeps,
  appUpdater: BehaviorSubject<AppUpdater>
) => {
  Object.entries(services).forEach(([key, provider]) =>
    provider.start(coreSetup, coreStart, canvasSetupPlugins, canvasStartPlugins, appUpdater)
  );
};

export const stopServices = () => {
  Object.entries(services).forEach(([key, provider]) => provider.stop());
};

export const {
  notify: notifyService,
  platform: platformService,
  navLink: navLinkService,
} = services;
