/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FieldVisConfig } from '../../stats_table/types';
import { JOB_FIELD_TYPES } from '../../../../../../common';

export function getCompatibleLensDataType(type: FieldVisConfig['type']): string | undefined {
  let lensType: string | undefined;
  switch (type) {
    case JOB_FIELD_TYPES.KEYWORD:
      lensType = 'string';
      break;
    case JOB_FIELD_TYPES.DATE:
      lensType = 'date';
      break;
    case JOB_FIELD_TYPES.NUMBER:
      lensType = 'number';
      break;
    case JOB_FIELD_TYPES.IP:
      lensType = 'ip';
      break;
    case JOB_FIELD_TYPES.BOOLEAN:
      lensType = 'string';
      break;
    default:
      lensType = undefined;
  }
  return lensType;
}
