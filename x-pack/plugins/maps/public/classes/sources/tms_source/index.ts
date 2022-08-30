/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RasterTileSource } from '@kbn/mapbox-gl';
import { DataFilters } from '../../../../common/descriptor_types';
import { ISource } from '../source';

export interface RasterTileSourceData {
  url: string;
}

export interface ITMSSource extends ISource {
  getUrlTemplate(dataFilters: DataFilters): Promise<string>;
  isSourceStale(mbSource:RasterTileSource,sourceDataRequest:object):boolean;
}
