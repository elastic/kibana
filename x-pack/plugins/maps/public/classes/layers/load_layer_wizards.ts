/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerLayerWizard } from './layer_wizard_registry';
import { uploadLayerWizardConfig } from './file_upload_wizard';
// @ts-ignore
import { esDocumentsLayerWizardConfig } from '../sources/es_search_source';
// @ts-ignore
import { clustersLayerWizardConfig, heatmapLayerWizardConfig } from '../sources/es_geo_grid_source';
// @ts-ignore
import { point2PointLayerWizardConfig } from '../sources/es_pew_pew_source';
// @ts-ignore
import { emsBoundariesLayerWizardConfig } from '../sources/ems_file_source';
// @ts-ignore
import { emsBaseMapLayerWizardConfig } from '../sources/ems_tms_source';
// @ts-ignore
import { kibanaRegionMapLayerWizardConfig } from '../sources/kibana_regionmap_source';
// @ts-ignore
import { kibanaBasemapLayerWizardConfig } from '../sources/kibana_tilemap_source';
import { tmsLayerWizardConfig } from '../sources/xyz_tms_source';
// @ts-ignore
import { wmsLayerWizardConfig } from '../sources/wms_source';
import { mvtVectorSourceWizardConfig } from '../sources/mvt_single_layer_vector_source';
import { ObservabilityLayerWizardConfig } from './solution_layers/observability';
import { SecurityLayerWizardConfig } from './solution_layers/security';
import { choroplethLayerWizardConfig } from './choropleth_layer_wizard';

let registered = false;
export function registerLayerWizards() {
  if (registered) {
    return;
  }

  // Registration order determines display order
  registerLayerWizard(uploadLayerWizardConfig);
  registerLayerWizard(ObservabilityLayerWizardConfig);
  registerLayerWizard(SecurityLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(esDocumentsLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(choroplethLayerWizardConfig);
  registerLayerWizard(clustersLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(heatmapLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(point2PointLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(emsBoundariesLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(emsBaseMapLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(kibanaRegionMapLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(kibanaBasemapLayerWizardConfig);
  registerLayerWizard(tmsLayerWizardConfig);
  // @ts-ignore
  registerLayerWizard(wmsLayerWizardConfig);

  registerLayerWizard(mvtVectorSourceWizardConfig);
  registered = true;
}
