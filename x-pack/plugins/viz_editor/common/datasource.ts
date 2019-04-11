/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Scale } from '../public/common/components/operation_editor';

// TODO: extend this to everything Kibana currently supports
export type BasicFieldType = 'number' | 'string' | 'date' | 'boolean' | 'unknown';

export interface DatasourceField<T extends string = BasicFieldType> {
  name: string;
  type: T;
  aggregatable: boolean;
  searchable: boolean;
}

export function isFieldApplicableForScale<T extends string = BasicFieldType>(
  scale: Scale,
  field: DatasourceField<T>
) {
  if (scale === 'ordinal') {
    return true;
  }

  return ['date', 'number'].includes(field.type);
}
