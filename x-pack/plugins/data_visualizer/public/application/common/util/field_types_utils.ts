/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/public';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { getFieldType } from '@kbn/field-utils/src/utils/get_field_type';
import { SUPPORTED_FIELD_TYPES } from '../../../../common/constants';

// convert kibana types to ML Job types
// this is needed because kibana types only have string and not text and keyword.
// and we can't use ES_FIELD_TYPES because it has no NUMBER type
export function kbnTypeToSupportedType(field: DataViewField) {
  // Return undefined if not one of the supported data visualizer field types.
  let type;

  switch (field.type) {
    case KBN_FIELD_TYPES.STRING:
      type = field.aggregatable ? SUPPORTED_FIELD_TYPES.KEYWORD : SUPPORTED_FIELD_TYPES.TEXT;

      if (field.esTypes?.includes(SUPPORTED_FIELD_TYPES.VERSION)) {
        type = SUPPORTED_FIELD_TYPES.VERSION;
      }
      break;

    default:
      type = getFieldType(field);
      break;
  }

  return type;
}
