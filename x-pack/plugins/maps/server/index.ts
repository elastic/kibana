/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/server';
import { PluginConfigDescriptor } from 'kibana/server';
import { MapsPlugin } from './plugin';
import { configSchema, MapsXPackConfig } from '../config';

export const config: PluginConfigDescriptor<MapsXPackConfig> = {
  // exposeToBrowser specifies kibana.yml settings to expose to the browser
  // the value `true` in this context signals configuration is exposed to browser
  exposeToBrowser: {
    showMapsInspectorAdapter: true,
    preserveDrawingBuffer: true,
  },
  schema: configSchema,
};

export const plugin = (initializerContext: PluginInitializerContext) =>
  new MapsPlugin(initializerContext);
