/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../../../common/constants';
import { registerSource } from './source_registry';
import { EMSFileSource } from './ems_file_source';
import { EMSTMSSource } from './ems_tms_source';
import { ESGeoGridSource } from './es_geo_grid_source';
import { ESGeoLineSource } from './es_geo_line_source';
import { ESPewPewSource } from './es_pew_pew_source';
import { ESSearchSource } from './es_search_source';
import { ESQLSource } from './esql_source';
import { GeoJsonFileSource } from './geojson_file_source';
import { KibanaTilemapSource } from './kibana_tilemap_source';
import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import { WMSSource } from './wms_source';
import { XYZTMSSource } from './xyz_tms_source';

let registered = false;

export function setupSources() {
  if (registered) {
    return;
  }

  registerSource({
    ConstructorFunction: EMSFileSource,
    type: SOURCE_TYPES.EMS_FILE,
  });

  registerSource({
    ConstructorFunction: EMSTMSSource,
    type: SOURCE_TYPES.EMS_TMS,
  });

  registerSource({
    ConstructorFunction: ESGeoGridSource,
    type: SOURCE_TYPES.ES_GEO_GRID,
  });

  registerSource({
    ConstructorFunction: ESGeoLineSource,
    type: SOURCE_TYPES.ES_GEO_LINE,
  });

  registerSource({
    ConstructorFunction: ESPewPewSource,
    type: SOURCE_TYPES.ES_PEW_PEW,
  });

  registerSource({
    ConstructorFunction: ESSearchSource,
    type: SOURCE_TYPES.ES_SEARCH,
  });

  registerSource({
    ConstructorFunction: ESQLSource,
    type: SOURCE_TYPES.ESQL,
  });

  registerSource({
    ConstructorFunction: GeoJsonFileSource,
    type: SOURCE_TYPES.GEOJSON_FILE,
  });

  registerSource({
    ConstructorFunction: KibanaTilemapSource,
    type: SOURCE_TYPES.KIBANA_TILEMAP,
  });

  registerSource({
    ConstructorFunction: MVTSingleLayerVectorSource,
    type: SOURCE_TYPES.MVT_SINGLE_LAYER,
  });

  registerSource({
    ConstructorFunction: WMSSource,
    type: SOURCE_TYPES.WMS,
  });

  registerSource({
    ConstructorFunction: XYZTMSSource,
    type: SOURCE_TYPES.EMS_XYZ,
  });

  registered = true;
}
