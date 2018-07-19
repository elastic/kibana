/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraFrameworkRequest } from '../framework';

export interface FieldsAdapter {
  getFieldCaps(
    req: InfraFrameworkRequest,
    indexPattern: string | string[]
  ): Promise<FieldCapsResponse>;
}

export interface FieldCapsResponse {
  fields: {
    [fieldName: string]: {
      [fieldType: string]: {
        searchable: boolean;
        aggregatable: boolean;
        indices?: string[];
        non_aggregatable_indices?: string[];
        non_searchable_indices?: string[];
      };
    };
  };
}
