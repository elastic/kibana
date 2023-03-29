/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { SUPPORTED_FIELD_TYPES } from '../../../../common/constants';

// convert kibana types to ML Job types
// this is needed because kibana types only have string and not text and keyword.
// and we can't use ES_FIELD_TYPES because it has no NUMBER type
export function kbnTypeToJobType(field: DataViewField) {
  // Return undefined if not one of the supported data visualizer field types.
  let type;

  switch (field.type) {
    case KBN_FIELD_TYPES.STRING:
      type = field.aggregatable ? SUPPORTED_FIELD_TYPES.KEYWORD : SUPPORTED_FIELD_TYPES.TEXT;

      if (field.esTypes?.includes(SUPPORTED_FIELD_TYPES.VERSION)) {
        type = SUPPORTED_FIELD_TYPES.VERSION;
      }
      break;
    case KBN_FIELD_TYPES.NUMBER:
      if (field.esTypes?.some((d) => d === ES_FIELD_TYPES.AGGREGATE_METRIC_DOUBLE)) {
        break;
      }
      type = SUPPORTED_FIELD_TYPES.NUMBER;
      break;
    case KBN_FIELD_TYPES.DATE:
      type = SUPPORTED_FIELD_TYPES.DATE;
      break;
    case KBN_FIELD_TYPES.IP:
      type = SUPPORTED_FIELD_TYPES.IP;
      break;
    case KBN_FIELD_TYPES.BOOLEAN:
      type = SUPPORTED_FIELD_TYPES.BOOLEAN;
      break;
    case KBN_FIELD_TYPES.GEO_POINT:
      type = SUPPORTED_FIELD_TYPES.GEO_POINT;
      break;
    case KBN_FIELD_TYPES.GEO_SHAPE:
      type = SUPPORTED_FIELD_TYPES.GEO_SHAPE;
      break;
    case KBN_FIELD_TYPES.HISTOGRAM:
      type = SUPPORTED_FIELD_TYPES.HISTOGRAM;
      break;

    default:
      break;
  }

  return type;
}
