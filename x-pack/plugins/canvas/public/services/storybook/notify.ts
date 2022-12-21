/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { StorybookParams } from '.';
import { CanvasNotifyService } from '../notify';

type CanvasNotifyServiceFactory = PluginServiceFactory<CanvasNotifyService, StorybookParams>;

export const notifyServiceFactory: CanvasNotifyServiceFactory = () => ({
  success: (message) => action(`success: ${message}`)(),
  error: (message) => action(`error: ${message}`)(),
  info: (message) => action(`info: ${message}`)(),
  warning: (message) => action(`warning: ${message}`)(),
});
