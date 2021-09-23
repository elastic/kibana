/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerLayerWizard } from './layer_wizard_registry';
import { uploadLayerWizardConfig } from './file_upload_wizard';
import {
  esDocumentsLayerWizardConfig,
  esTopHitsLayerWizardConfig,
} from '../sources/es_search_source';
import { clustersLayerWizardConfig, heatmapLayerWizardConfig } from '../sources/es_geo_grid_source';
import { geoLineLayerWizardConfig } from '../sources/es_geo_line_source';
// @ts-ignore
import { point2PointLayerWizardConfig } from '../sources/es_pew_pew_source';
// @ts-ignore
import { emsBoundariesLayerWizardConfig } from '../sources/ems_file_source';
// @ts-ignore
import { emsBaseMapLayerWizardConfig } from '../sources/ems_tms_source';
// @ts-ignore
import { kibanaBasemapLayerWizardConfig } from '../sources/kibana_tilemap_source';
import { tmsLayerWizardConfig } from '../sources/xyz_tms_source';
// @ts-ignore
import { wmsLayerWizardConfig } from '../sources/wms_source';
import { mvtVectorSourceWizardConfig } from '../sources/mvt_single_layer_vector_source';
import { ObservabilityLayerWizardConfig } from './solution_layers/observability';
import { SecurityLayerWizardConfig } from './solution_layers/security';
import { choroplethLayerWizardConfig } from './choropleth_layer_wizard';
import { newVectorLayerWizardConfig } from './new_vector_layer_wizard';

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
