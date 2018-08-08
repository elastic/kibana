/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { ML_JOB_FIELD_TYPES, KBN_FIELD_TYPES } from 'plugins/ml/../common/constants/field_types';

// convert kibana types to ML Job types
// this is needed because kibana types only have string and not text and keyword.
// and we can't use ES_FIELD_TYPES because it has no NUMBER type
export function kbnTypeToMLJobType(field) {
  // Return undefined if not one of the supported data visualizer field types.
  let type = undefined;
  switch (field.type) {
    case KBN_FIELD_TYPES.STRING:
      type = field.aggregatable ? ML_JOB_FIELD_TYPES.KEYWORD : ML_JOB_FIELD_TYPES.TEXT;
      break;
    case KBN_FIELD_TYPES.NUMBER:
      type = ML_JOB_FIELD_TYPES.NUMBER;
      break;
    case KBN_FIELD_TYPES.DATE:
      type = ML_JOB_FIELD_TYPES.DATE;
      break;
    case KBN_FIELD_TYPES.IP:
      type = ML_JOB_FIELD_TYPES.IP;
      break;
    case KBN_FIELD_TYPES.BOOLEAN:
      type = ML_JOB_FIELD_TYPES.BOOLEAN;
      break;
    case KBN_FIELD_TYPES.GEO_POINT:
      type = ML_JOB_FIELD_TYPES.GEO_POINT;
      break;
    default:
      break;
  }

  return type;
}
