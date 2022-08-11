/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerLayerWizardInternal } from './layer_wizard_registry';
import { uploadLayerWizardConfig } from './file_upload_wizard';
import {
  esDocumentsLayerWizardConfig,
  esTopHitsLayerWizardConfig,
} from '../../sources/es_search_source';
import {
  clustersLayerWizardConfig,
  heatmapLayerWizardConfig,
} from '../../sources/es_geo_grid_source';
import { geoLineLayerWizardConfig } from '../../sources/es_geo_line_source';
import { point2PointLayerWizardConfig } from '../../sources/es_pew_pew_source/point_2_point_layer_wizard';
import { emsBoundariesLayerWizardConfig } from '../../sources/ems_file_source';
import { emsBaseMapLayerWizardConfig } from '../../sources/ems_tms_source';
import { kibanaBasemapLayerWizardConfig } from '../../sources/kibana_tilemap_source/kibana_base_map_layer_wizard';
import { tmsLayerWizardConfig } from '../../sources/xyz_tms_source';
import { wmsLayerWizardConfig } from '../../sources/wms_source/wms_layer_wizard';
import { mvtVectorSourceWizardConfig } from '../../sources/mvt_single_layer_vector_source';
import { ObservabilityLayerWizardConfig } from './solution_layers/observability';
import { SecurityLayerWizardConfig } from './solution_layers/security';
import { choroplethLayerWizardConfig } from './choropleth_layer_wizard';
import { newVectorLayerWizardConfig } from './new_vector_layer_wizard';

let registered = false;

export function registerLayerWizards() {
  if (registered) {
    return;
  }

  registerLayerWizardInternal(uploadLayerWizardConfig);
  registerLayerWizardInternal(esDocumentsLayerWizardConfig);
  registerLayerWizardInternal(choroplethLayerWizardConfig);
  registerLayerWizardInternal(clustersLayerWizardConfig);
  registerLayerWizardInternal(heatmapLayerWizardConfig);
  registerLayerWizardInternal(esTopHitsLayerWizardConfig);
  registerLayerWizardInternal(geoLineLayerWizardConfig);
  registerLayerWizardInternal(point2PointLayerWizardConfig);
  registerLayerWizardInternal(emsBoundariesLayerWizardConfig);
  registerLayerWizardInternal(newVectorLayerWizardConfig);
  registerLayerWizardInternal(emsBaseMapLayerWizardConfig);
  registerLayerWizardInternal(kibanaBasemapLayerWizardConfig);
  registerLayerWizardInternal(tmsLayerWizardConfig);
  registerLayerWizardInternal(wmsLayerWizardConfig);

  registerLayerWizardInternal(mvtVectorSourceWizardConfig);
  registerLayerWizardInternal(ObservabilityLayerWizardConfig);
  registerLayerWizardInternal(SecurityLayerWizardConfig);
  registered = true;
}
