/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { SchemaBaseLogic, SchemaBaseValues, SchemaBaseActions } from './schema_base_logic';
import { MetaEngineSchemaApiResponse } from './types';

interface MetaEngineSchemaValues extends SchemaBaseValues {
  fields: MetaEngineSchemaApiResponse['fields'];
  conflictingFields: MetaEngineSchemaApiResponse['conflictingFields'];
  conflictingFieldsCount: number;
  hasConflicts: boolean;
}

interface MetaEngineSchemaActions extends SchemaBaseActions {
  onSchemaLoad(response: MetaEngineSchemaApiResponse): MetaEngineSchemaApiResponse;
}

export const MetaEngineSchemaLogic = kea<
  MakeLogicType<MetaEngineSchemaValues, MetaEngineSchemaActions>
>({
  path: ['enterprise_search', 'app_search', 'meta_engine_schema_logic'],
  connect: {
    values: [SchemaBaseLogic, ['dataLoading', 'schema']],
    actions: [SchemaBaseLogic, ['loadSchema', 'onSchemaLoad']],
  },
  reducers: {
    fields: [
      {},
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onSchemaLoad: (_, { fields }) => fields,
      },
    ],
    conflictingFields: [
      {},
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onSchemaLoad: (_, { conflictingFields }) => conflictingFields,
      },
    ],
  },
  selectors: {
    conflictingFieldsCount: [
      (selectors) => [selectors.conflictingFields],
      (conflictingFields) => Object.keys(conflictingFields).length,
    ],
    hasConflicts: [
      (selectors) => [selectors.conflictingFieldsCount],
      (conflictingFieldsCount) => conflictingFieldsCount > 0,
    ],
  },
});
