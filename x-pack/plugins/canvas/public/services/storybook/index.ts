/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginServices,
  PluginServiceProviders,
  PluginServiceProvider,
} from '../../../../../../src/plugins/presentation_util/public';

import { CanvasPluginServices } from '..';
import { providers as stubProviders } from '../stubs';
import { workpadServiceFactory } from './workpad';

export interface StorybookParams {
  hasTemplates?: boolean;
  useStaticData?: boolean;
  workpadCount?: number;
}

export const providers: PluginServiceProviders<CanvasPluginServices, StorybookParams> = {
  ...stubProviders,
  workpad: new PluginServiceProvider(workpadServiceFactory),
};

export const pluginServices = new PluginServices<CanvasPluginServices>();

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
