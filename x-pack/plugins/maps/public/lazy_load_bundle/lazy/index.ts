/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// These are map-dependencies of the embeddable.
// By lazy-loading these, the Maps-app can register the embeddable when the plugin mounts, without actually pulling all the code.

export * from '../../routing/bootstrap/services/gis_map_saved_object_loader';
export * from '../../embeddable/map_embeddable';
export * from '../../kibana_services';
export * from '../../reducers/store';
export * from '../../actions';
export * from '../../selectors/map_selectors';
export * from '../../routing/bootstrap/get_initial_layers';
export * from '../../embeddable/merge_input_with_saved_map';
export { renderApp } from '../../routing/render_app';
export * from '../../classes/layers/solution_layers/security';
export { registerLayerWizard } from '../../classes/layers/layer_wizard_registry';
export { registerSource } from '../../classes/sources/source_registry';
export { getIndexPatternsFromIds } from '../../index_pattern_util';
export { createTileMapLayerDescriptor } from '../../classes/layers/create_tile_map_layer_descriptor';
export { createRegionMapLayerDescriptor } from '../../classes/layers/create_region_map_layer_descriptor';
