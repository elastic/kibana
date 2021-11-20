/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { isEqual } from 'lodash';

import {
  flashAPIErrors,
  setErrorMessage,
  flashSuccessToast,
  clearFlashMessages,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { Schema, SchemaType, IndexJob } from '../../../shared/schema/types';
import { EngineLogic } from '../engine';

import { ADD_SCHEMA_ERROR, ADD_SCHEMA_SUCCESS, UPDATE_SCHEMA_SUCCESS } from './constants';
import { SchemaBaseLogic, SchemaBaseValues, SchemaBaseActions } from './schema_base_logic';
import { SchemaApiResponse } from './types';

interface SchemaValues extends SchemaBaseValues {
  isUpdating: boolean;
  hasSchema: boolean;
  hasSchemaChanged: boolean;
  cachedSchema: Schema;
  mostRecentIndexJob: Partial<IndexJob>;
  unconfirmedFields: string[];
  hasUnconfirmedFields: boolean;
  hasNewUnsearchedFields: boolean;
  isModalOpen: boolean;
}

interface SchemaActions extends SchemaBaseActions {
  onSchemaLoad(response: SchemaApiResponse): SchemaApiResponse;
  addSchemaField(
    fieldName: string,
    fieldType: SchemaType
  ): { fieldName: string; fieldType: SchemaType };
  updateSchemaFieldType(
    fieldName: string,
    fieldType: SchemaType
  ): { fieldName: string; fieldType: SchemaType };
  updateSchema(successMessage?: string): string | undefined;
  onSchemaUpdateError(): void;
  openModal(): void;
  closeModal(): void;
}

export const SchemaLogic = kea<MakeLogicType<SchemaValues, SchemaActions>>({
  path: ['enterprise_search', 'app_search', 'schema_logic'],
  connect: {
    values: [SchemaBaseLogic, ['dataLoading', 'schema']],
    actions: [SchemaBaseLogic, ['loadSchema', 'onSchemaLoad', 'setSchema']],
  },
  actions: {
    addSchemaField: (fieldName, fieldType) => ({ fieldName, fieldType }),
    updateSchemaFieldType: (fieldName, fieldType) => ({ fieldName, fieldType }),
    updateSchema: (successMessage) => successMessage,
    onSchemaUpdateError: true,
    openModal: true,
    closeModal: true,
  },
  reducers: {
    isUpdating: [
      false,
      {
        updateSchema: () => true,
        onSchemaLoad: () => false,
        onSchemaUpdateError: () => false,
      },
    ],
    cachedSchema: [
      {},
      {
        onSchemaLoad: (_, { schema }) => schema,
      },
    ],
    mostRecentIndexJob: [
      {},
      {
        onSchemaLoad: (_, { mostRecentIndexJob }) => mostRecentIndexJob,
      },
    ],
    unconfirmedFields: [
      [],
      {
        onSchemaLoad: (_, { unconfirmedFields }) => unconfirmedFields,
      },
    ],
    hasNewUnsearchedFields: [
      false,
      {
        onSchemaLoad: (_, { unsearchedUnconfirmedFields }) => unsearchedUnconfirmedFields,
      },
    ],
    isModalOpen: [
      false,
      {
        openModal: () => true,
        closeModal: () => false,
        onSchemaLoad: () => false,
        onSchemaUpdateError: () => false,
      },
    ],
  },
  selectors: {
    hasSchema: [
      (selectors) => [selectors.cachedSchema],
      (cachedSchema) => Object.keys(cachedSchema).length > 0,
    ],
    hasSchemaChanged: [
      (selectors) => [selectors.schema, selectors.cachedSchema],
      (schema, cachedSchema) => !isEqual(schema, cachedSchema),
    ],
    hasUnconfirmedFields: [
      (selectors) => [selectors.unconfirmedFields],
      (unconfirmedFields) => unconfirmedFields.length > 0,
    ],
  },
  listeners: ({ actions, values }) => ({
    addSchemaField: ({ fieldName, fieldType }) => {
      if (values.schema.hasOwnProperty(fieldName)) {
        setErrorMessage(ADD_SCHEMA_ERROR(fieldName));
        actions.closeModal();
      } else {
        const updatedSchema = { ...values.schema };
        updatedSchema[fieldName] = fieldType;
        actions.setSchema(updatedSchema);
        actions.updateSchema(ADD_SCHEMA_SUCCESS(fieldName));
      }
    },
    updateSchemaFieldType: ({ fieldName, fieldType }) => {
      const updatedSchema = { ...values.schema };
      updatedSchema[fieldName] = fieldType;
      actions.setSchema(updatedSchema);
    },
    updateSchema: async (successMessage) => {
      const { schema } = values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      clearFlashMessages();

      try {
        const response = await http.post<SchemaApiResponse>(
          `/internal/app_search/engines/${engineName}/schema`,
          { body: JSON.stringify(schema) }
        );
        actions.onSchemaLoad(response);
        flashSuccessToast(successMessage || UPDATE_SCHEMA_SUCCESS);
      } catch (e) {
        flashAPIErrors(e);
        actions.onSchemaUpdateError();
        // Restore updated schema back to server/cached schema, so we don't keep
        // erroneous or bad fields in-state
        actions.setSchema(values.cachedSchema);
      } finally {
        // Re-fetch engine data so that other views also dynamically update
        // (e.g. Documents results, nav icons for invalid boosts or unconfirmed flags)
        EngineLogic.actions.initializeEngine();
      }
    },
  }),
});
