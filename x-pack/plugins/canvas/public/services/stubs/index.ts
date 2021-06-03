/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CanvasServices, services } from '../';
import { embeddablesService } from './embeddables';
import { expressionsService } from './expressions';
import { reportingService } from './reporting';
import { navLinkService } from './nav_link';
import { notifyService } from './notify';
import { labsService } from './labs';
import { platformService } from './platform';
import { searchService } from './search';
import { workpadService } from './workpad';

export const stubs: CanvasServices = {
  embeddables: embeddablesService,
  expressions: expressionsService,
  reporting: reportingService,
  navLink: navLinkService,
  notify: notifyService,
  platform: platformService,
  search: searchService,
  labs: labsService,
  workpad: workpadService,
};

export const startServices = async (providedServices: Partial<CanvasServices> = {}) => {
  Object.entries(services).forEach(([key, provider]) => {
    // @ts-expect-error Object.entries isn't strongly typed
    const stub = providedServices[key] || stubs[key];
    provider.setService(stub);
  });
};
