/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Scale } from '../public/common/components/operation_editor';

export type FieldType = 'number' | 'string' | 'date';

export interface DatasourceField {
  name: string;
  type: FieldType;
  aggregatable: boolean;
  searchable: boolean;
}

export function isFieldApplicableForScale(scale: Scale, field: DatasourceField) {
  if (scale === 'ordinal') {
    return true;
  }

  return ['date', 'number'].includes(field.type);
}
