/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { emsBoundariesLayerWizardConfig } from '../sources/ems_file_source/ems_boundaries_layer_wizard';
// @ts-ignore
import { emsBaseMapLayerWizardConfig } from '../sources/ems_tms_source';
import { clustersLayerWizardConfig } from '../sources/es_geo_grid_source/clusters_layer_wizard';
import { heatmapLayerWizardConfig } from '../sources/es_geo_grid_source/heatmap_layer_wizard';
import { geoLineLayerWizardConfig } from '../sources/es_geo_line_source/layer_wizard';
// @ts-ignore
import { point2PointLayerWizardConfig } from '../sources/es_pew_pew_source';
import { esDocumentsLayerWizardConfig } from '../sources/es_search_source/es_documents_layer_wizard';
import { esTopHitsLayerWizardConfig } from '../sources/es_search_source/top_hits/wizard';
// @ts-ignore
import { kibanaBasemapLayerWizardConfig } from '../sources/kibana_tilemap_source';
import { mvtVectorSourceWizardConfig } from '../sources/mvt_single_layer_vector_source/layer_wizard';
// @ts-ignore
import { wmsLayerWizardConfig } from '../sources/wms_source';
import { tmsLayerWizardConfig } from '../sources/xyz_tms_source/layer_wizard';
import { choroplethLayerWizardConfig } from './choropleth_layer_wizard/choropleth_layer_wizard';
import { uploadLayerWizardConfig } from './file_upload_wizard/config';
import { registerLayerWizard } from './layer_wizard_registry';
import { newVectorLayerWizardConfig } from './new_vector_layer_wizard/config';
import { ObservabilityLayerWizardConfig } from './solution_layers/observability/observability_layer_wizard';
import { SecurityLayerWizardConfig } from './solution_layers/security/security_layer_wizard';

let registered = false;
export function registerLayerWizards() {
  if (registered) {
    return;
  }

  // Registration order determines display order
  registerLayerWizard(uploadLayerWizardConfig);
  registerLayerWizard(esDocumentsLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(choroplethLayerWizardConfig);
  registerLayerWizard(clustersLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(heatmapLayerWizardConfig);
  registerLayerWizard(esTopHitsLayerWizardConfig);
  registerLayerWizard(geoLineLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(point2PointLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(emsBoundariesLayerWizardConfig);
  registerLayerWizard(newVectorLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(emsBaseMapLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(kibanaBasemapLayerWizardConfig);
  registerLayerWizard(tmsLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(wmsLayerWizardConfig);

  registerLayerWizard(mvtVectorSourceWizardConfig);
  registerLayerWizard(ObservabilityLayerWizardConfig);
  registerLayerWizard(SecurityLayerWizardConfig);
  registered = true;
}
