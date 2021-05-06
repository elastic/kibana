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

export interface SchemaBaseValues {
  dataLoading: boolean;
  schema: Schema;
}

export interface SchemaBaseActions {
  loadSchema(callback: Function): Function;
  setSchema(schema: Schema): { schema: Schema };
}

export const SchemaBaseLogic = kea<MakeLogicType<SchemaBaseValues, SchemaBaseActions>>({
  path: ['enterprise_search', 'app_search', 'schema_base_logic'],
  actions: {
    loadSchema: (callback) => callback,
    setSchema: (schema) => ({ schema }),
  },
  reducers: {
    dataLoading: [
      true,
      {
        loadSchema: () => true,
        setSchema: () => false,
      },
    ],
    schema: [
      {},
      {
        setSchema: (_, { schema }) => schema,
      },
    ],
  },
  listeners: ({ actions }) => ({
    loadSchema: async (callback) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(`/api/app_search/engines/${engineName}/schema`);
        actions.setSchema(response.schema);
        callback(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
