/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { CanvasCustomElementService } from '../custom_element';

type CanvasCustomElementServiceFactory = PluginServiceFactory<CanvasCustomElementService>;

const noop = (..._args: any[]): any => {};

export const customElementServiceFactory: CanvasCustomElementServiceFactory = () => ({
  create: noop,
  find: noop,
  get: noop,
  remove: noop,
  update: noop,
});
