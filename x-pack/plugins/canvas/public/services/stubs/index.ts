/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasServices, services } from '../';
import { embeddablesService } from './embeddables';
import { expressionsService } from './expressions';
import { navLinkService } from './nav_link';
import { notifyService } from './notify';
import { platformService } from './platform';

export const stubs: CanvasServices = {
  embeddables: embeddablesService,
  expressions: expressionsService,
  navLink: navLinkService,
  notify: notifyService,
  platform: platformService,
};

export const startServices = async (providedServices: Partial<CanvasServices> = {}) => {
  Object.entries(services).forEach(([key, provider]) => {
    // @ts-expect-error Object.entries isn't strongly typed
    const stub = providedServices[key] || stubs[key];
    provider.setService(stub);
  });
};
