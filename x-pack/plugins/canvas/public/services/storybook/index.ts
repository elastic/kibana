/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginServiceProviders,
  PluginServiceProvider,
} from '@kbn/presentation-util-plugin/public';

import { CanvasPluginServices } from '..';
import { pluginServiceProviders as stubProviders } from '../stubs';
import { workpadServiceFactory } from './workpad';
import { notifyServiceFactory } from './notify';

export interface StorybookParams {
  hasTemplates?: boolean;
  useStaticData?: boolean;
  workpadCount?: number;
}

export const pluginServiceProviders: PluginServiceProviders<CanvasPluginServices, StorybookParams> =
  {
    ...stubProviders,
    workpad: new PluginServiceProvider(workpadServiceFactory),
    notify: new PluginServiceProvider(notifyServiceFactory),
  };

export const argTypes = {
  hasTemplates: {
    name: 'Has templates?',
    type: {
      name: 'boolean',
    },
    defaultValue: true,
    control: {
      type: 'boolean',
    },
  },
  useStaticData: {
    name: 'Use static data?',
    type: {
      name: 'boolean',
    },
    defaultValue: false,
    control: {
      type: 'boolean',
    },
  },
  workpadCount: {
    name: 'Number of workpads',
    type: { name: 'number' },
    defaultValue: 5,
    control: {
      type: 'range',
    },
  },
};
