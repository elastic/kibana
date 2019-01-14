/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { EMSFileSource } from './ems_file_source';
import { KibanaRegionmapSource } from './kibana_regionmap_source';
import { XYZTMSSource } from './xyz_tms_source';
import { EMSTMSSource } from './ems_tms_source';
import { WMSSource } from './wms_source';
import { KibanaTilemapSource } from './kibana_tilemap_source';
import { ESGeohashGridSource } from './es_geohashgrid_source';
import { ESSearchSource } from './es_search_source';


export const ALL_SOURCES = [
  ESSearchSource,
  ESGeohashGridSource,
  EMSFileSource,
  EMSTMSSource,
  KibanaRegionmapSource,
  KibanaTilemapSource,
  XYZTMSSource,
  WMSSource,
];
