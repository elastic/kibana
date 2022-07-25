/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { CanvasNavLinkService } from '../nav_link';

type CanvasNavLinkServiceFactory = PluginServiceFactory<CanvasNavLinkService>;

const noop = (..._args: any[]): any => {};

export const navLinkServiceFactory: CanvasNavLinkServiceFactory = () => ({
  updatePath: noop,
});
