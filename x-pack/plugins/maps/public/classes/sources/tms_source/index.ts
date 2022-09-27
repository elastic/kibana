/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataFilters } from '../../../../common/descriptor_types';
import { DataRequest } from '../../util/data_request';
import { ISource } from '../source';
import { DataRequestMeta} from '../../../../common/descriptor_types';
import { RasterTileSource } from '@kbn/mapbox-gl';
export interface RasterTileSourceData {
  url: string;
}
export interface ITMSSource extends ISource {
  getUrlTemplate(dataFilters: DataFilters): Promise<string>;
  canSkipSourceUpdate(dataRequest:DataRequest,nextRequestMeta:DataRequestMeta): Promise<boolean>;
  isSourceStale(mbSource:RasterTileSource,sourceDataRequest:RasterTileSourceData):boolean;
}
