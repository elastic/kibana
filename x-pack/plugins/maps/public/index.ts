/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer } from 'kibana/public';
import { PluginInitializerContext } from 'kibana/public';
import { MapsPlugin, MapsPluginSetup, MapsPluginStart } from './plugin';
import { MapsXPackConfig } from '../config';

export const plugin: PluginInitializer<MapsPluginSetup, MapsPluginStart> = (
  initContext: PluginInitializerContext<MapsXPackConfig>
) => {
  // @ts-ignore
  return new MapsPlugin(initContext);
};

export { MAP_SAVED_OBJECT_TYPE } from '../common/constants';

export { RenderTooltipContentParams } from './classes/tooltips/tooltip_property';

export { MapsStartApi } from './api';
export { MapsSetupApi } from './api';

// ML - changes
export { IVectorSource, GeoJsonWithMeta } from './classes/sources/vector_source/vector_source';
export { LICENSED_FEATURES } from './licensed_features';
export { Attribution, ImmutableSourceProperty, PreIndexedShape } from './classes/sources/source';
export { BoundsFilters } from './classes/sources/vector_source/vector_source';
export { IField } from './classes/fields/field';
export { VectorStyle } from './classes/styles/vector/vector_style';
export { LayerWizard, RenderWizardArguments } from './classes/layers/layer_wizard_registry';
export { VectorLayer } from './classes/layers/vector_layer/vector_layer';
