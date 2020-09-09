/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum COMBINED_FIELD_TYPES {
  GEO_POINT = 'GEO_POINT',
  CUSTOM = 'CUSTOM',
}

export interface CombinedField {
  type: COMBINED_FIELD_TYPES;
  combinedFieldName: string;
  fieldNames: string[];
}
