/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'kibana/public';
import { PluginInitializerContext } from 'kibana/server';
import { MapsPlugin, MapsPluginSetup, MapsPluginStart } from './plugin';

export interface MapsConfigType {
  enabled: boolean;
  showMapVisualizationTypes: boolean;
  showMapsInspectorAdapter: boolean;
  preserveDrawingBuffer: boolean;
  enableVectorTiles: boolean;
}

// @ts-ignore
export const plugin: PluginInitializer<MapsPluginSetup, MapsPluginStart> = (
  initContext: PluginInitializerContext
) => {
  // @ts-ignore
  return new MapsPlugin(initContext);
};

export { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
export { ITooltipProperty } from './classes/tooltips/tooltip_property';
