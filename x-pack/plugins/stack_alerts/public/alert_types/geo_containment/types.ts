/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeParams } from '../../../../alerting/common';
import { Query } from '../../../../../../src/plugins/data/common';

export interface GeoContainmentAlertParams extends AlertTypeParams {
  index: string;
  indexId: string;
  geoField: string;
  entity: string;
  dateField: string;
  boundaryType: string;
  boundaryIndexTitle: string;
  boundaryIndexId: string;
  boundaryGeoField: string;
  boundaryNameField?: string;
  indexQuery?: Query;
  boundaryIndexQuery?: Query;
}

// Will eventually include 'geo_shape'
export const ES_GEO_FIELD_TYPES = ['geo_point'];
export const ES_GEO_SHAPE_TYPES = ['geo_shape'];
