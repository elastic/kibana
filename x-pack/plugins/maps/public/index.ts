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
export { MAPS_APP_LOCATOR } from './locators';
export type { PreIndexedShape } from '../common/elasticsearch_util';

export { GEOJSON_FEATURE_ID_PROPERTY_NAME } from './classes/layers/vector_layer/geojson_vector_layer/assign_feature_ids';

export type {
  ITooltipProperty,
  RenderTooltipContentParams,
} from './classes/tooltips/tooltip_property';

export type { MapsSetupApi, MapsStartApi } from './api';

export type { MapEmbeddable, MapEmbeddableInput, MapEmbeddableOutput } from './embeddable';

export type { EMSTermJoinConfig, SampleValuesConfig } from './ems_autosuggest';

export type { IVectorSource, GeoJsonWithMeta } from './classes/sources/vector_source/vector_source';
export type { ImmutableSourceProperty, SourceEditorArgs } from './classes/sources/source';
export type { Attribution } from '../common/descriptor_types';
export type {
  BoundsRequestMeta,
  SourceStatus,
} from './classes/sources/vector_source/vector_source';
export type { IField } from './classes/fields/field';
export type { LayerWizard, RenderWizardArguments } from './classes/layers';
export type { DataRequest } from './classes/util/data_request';
