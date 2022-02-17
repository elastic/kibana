/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { Schema } from '../../../shared/schema/types';
import { EngineLogic } from '../engine';

import { SchemaApiResponse, MetaEngineSchemaApiResponse } from './types';

export interface SchemaBaseValues {
  dataLoading: boolean;
  schema: Schema;
}

export interface SchemaBaseActions {
  loadSchema(): void;
  onSchemaLoad(
    response: SchemaApiResponse | MetaEngineSchemaApiResponse
  ): SchemaApiResponse | MetaEngineSchemaApiResponse;
  setSchema(schema: Schema): { schema: Schema };
}

export const SchemaBaseLogic = kea<MakeLogicType<SchemaBaseValues, SchemaBaseActions>>({
  path: ['enterprise_search', 'app_search', 'schema_base_logic'],
  actions: {
    loadSchema: true,
    onSchemaLoad: (response) => response,
    setSchema: (schema) => ({ schema }),
  },
  reducers: {
    dataLoading: [
      true,
      {
        loadSchema: () => true,
        onSchemaLoad: () => false,
      },
    ],
    schema: [
      {},
      {
        onSchemaLoad: (_, { schema }) => schema,
        setSchema: (_, { schema }) => schema,
      },
    ],
  },
  listeners: ({ actions }) => ({
    loadSchema: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<SchemaApiResponse | MetaEngineSchemaApiResponse>(
          `/internal/app_search/engines/${engineName}/schema`
        );
        actions.onSchemaLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
