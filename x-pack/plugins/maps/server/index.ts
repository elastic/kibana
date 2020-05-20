/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext } from 'src/core/server';
import { PluginConfigDescriptor } from 'kibana/server';
import { MapsPlugin } from './plugin';
import { configSchema, MapsXPackConfig } from '../config';

export const config: PluginConfigDescriptor<MapsXPackConfig> = {
  exposeToBrowser: {
    enabled: true,
    showMapVisualizationTypes: true,
    showMapsInspectorAdapter: true,
    enableVectorTiles: true,
    preserveDrawingBuffer: true,
  },
  schema: configSchema,
};

export const plugin = (initializerContext: PluginInitializerContext) =>
  new MapsPlugin(initializerContext);
