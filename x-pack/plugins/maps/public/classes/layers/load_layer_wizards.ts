/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerLayerWizard } from './layer_wizard_registry';
import { uploadLayerWizardConfig } from '../sources/client_file_source';
// @ts-expect-error
import { esDocumentsLayerWizardConfig } from '../sources/es_search_source';
// @ts-expect-error
import { clustersLayerWizardConfig, heatmapLayerWizardConfig } from '../sources/es_geo_grid_source';
// @ts-expect-error
import { point2PointLayerWizardConfig } from '../sources/es_pew_pew_source';
// @ts-expect-error
import { emsBoundariesLayerWizardConfig } from '../sources/ems_file_source';
// @ts-expect-error
import { emsBaseMapLayerWizardConfig } from '../sources/ems_tms_source';
// @ts-expect-error
import { kibanaRegionMapLayerWizardConfig } from '../sources/kibana_regionmap_source';
// @ts-expect-error
import { kibanaBasemapLayerWizardConfig } from '../sources/kibana_tilemap_source';
import { tmsLayerWizardConfig } from '../sources/xyz_tms_source';
// @ts-expect-error
import { wmsLayerWizardConfig } from '../sources/wms_source';
import { mvtVectorSourceWizardConfig } from '../sources/mvt_single_layer_vector_source';
import { ObservabilityLayerWizardConfig } from './solution_layers/observability';
import { SecurityLayerWizardConfig } from './solution_layers/security';
import { choroplethLayerWizardConfig } from './choropleth_layer_wizard';
import { getEnableVectorTiles } from '../../kibana_services';

let registered = false;
export function registerLayerWizards() {
  if (registered) {
    return;
  }

  // Registration order determines display order
  registerLayerWizard(uploadLayerWizardConfig);
  registerLayerWizard(ObservabilityLayerWizardConfig);
  registerLayerWizard(SecurityLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(esDocumentsLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(choroplethLayerWizardConfig);
  registerLayerWizard(clustersLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(heatmapLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(point2PointLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(emsBoundariesLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(emsBaseMapLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(kibanaRegionMapLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(kibanaBasemapLayerWizardConfig);
  registerLayerWizard(tmsLayerWizardConfig);
  // @ts-expect-error
  registerLayerWizard(wmsLayerWizardConfig);

  if (getEnableVectorTiles()) {
    // eslint-disable-next-line no-console
    console.warn('Vector tiles are an experimental feature and should not be used in production.');
    registerLayerWizard(mvtVectorSourceWizardConfig);
  }
  registered = true;
}
