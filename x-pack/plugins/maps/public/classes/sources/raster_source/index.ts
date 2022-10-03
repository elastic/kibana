/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RasterTileSource } from '@kbn/mapbox-gl';
import { DataRequest } from '../../util/data_request';
import { ITMSSource } from '../tms_source';
import { DataRequestMeta } from '../../../../common/descriptor_types';
export interface RasterTileSourceData {
  url: string;
}
export interface IRasterSource extends ITMSSource {
  canSkipSourceUpdate(dataRequest: DataRequest, nextRequestMeta: DataRequestMeta): Promise<boolean>;
  isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData): boolean;
}
