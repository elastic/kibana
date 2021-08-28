/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import type { MapsXPackConfig } from '../config';
import type { MapsPluginSetup, MapsPluginStart } from './plugin';
import { MapsPlugin } from './plugin';

export const plugin: PluginInitializer<MapsPluginSetup, MapsPluginStart> = (
  initContext: PluginInitializerContext<MapsXPackConfig>
) => {
  // @ts-ignore
  return new MapsPlugin(initContext);
};

export { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
export { MapsStartApi } from './api';
export type { RenderTooltipContentParams } from './classes/tooltips/tooltip_property';
export type { MapEmbeddable, MapEmbeddableInput, MapEmbeddableOutput } from './embeddable';
export type { EMSTermJoinConfig, SampleValuesConfig } from './ems_autosuggest';
