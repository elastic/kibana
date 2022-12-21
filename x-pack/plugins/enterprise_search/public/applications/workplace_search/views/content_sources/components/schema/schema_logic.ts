/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { cloneDeep, isEqual } from 'lodash';

import { i18n } from '@kbn/i18n';

import { ADD, UPDATE } from '../../../../../shared/constants/operations';
import {
  flashAPIErrors,
  flashSuccessToast,
  setErrorMessage,
  clearFlashMessages,
} from '../../../../../shared/flash_messages';
import { defaultErrorMessage } from '../../../../../shared/flash_messages/handle_api_errors';
import { HttpLogic } from '../../../../../shared/http';
import {
  IndexJob,
  FieldCoercionErrors,
  Schema,
  SchemaType,
} from '../../../../../shared/schema/types';
import { TOperation } from '../../../../../shared/types';
import { AppLogic } from '../../../../app_logic';
import { OptionValue } from '../../../../types';
import { SourceLogic } from '../../source_logic';

import {
  SCHEMA_FIELD_ERRORS_ERROR_MESSAGE,
  SCHEMA_FIELD_ADDED_MESSAGE,
  SCHEMA_UPDATED_MESSAGE,
} from './constants';

interface SchemaActions {
  onInitializeSchema(schemaProps: SchemaInitialData): SchemaInitialData;
  onInitializeSchemaFieldErrors(
    fieldCoercionErrorsProps: SchemaChangeErrorsProps
  ): SchemaChangeErrorsProps;
  onSchemaSetSuccess(schemaProps: SchemaResponseProps): SchemaResponseProps;
  onSchemaSetFormErrors(errors: string[]): string[];
  updateNewFieldType(newFieldType: SchemaType): SchemaType;
  onFieldUpdate({ schema, formUnchanged }: { schema: Schema; formUnchanged: boolean }): {
    schema: Schema;
    formUnchanged: boolean;
  };
  onIndexingComplete(numDocumentsWithErrors: number): number;
  resetMostRecentIndexJob(emptyReindexJob: IndexJob): IndexJob;
  setFieldName(rawFieldName: string): string;
  setFilterValue(filterValue: string): string;
  addNewField(
    fieldName: string,
    newFieldType: SchemaType
  ): { fieldName: string; newFieldType: SchemaType };
  updateFields(): void;
  openAddFieldModal(): void;
  closeAddFieldModal(): void;
  resetSchemaState(): void;
  initializeSchema(): void;
  initializeSchemaFieldErrors(
    activeReindexJobId: string,
    sourceId: string
  ): { activeReindexJobId: string; sourceId: string };
  updateExistingFieldType(
    fieldName: string,
    newFieldType: SchemaType
  ): { fieldName: string; newFieldType: SchemaType };
  setServerField(
    updatedSchema: Schema,
    operation: TOperation
  ): { updatedSchema: Schema; operation: TOperation };
}

interface SchemaValues {
  sourceId: string;
  activeSchema: Schema;
  serverSchema: Schema;
  filterValue: string;
  filteredSchemaFields: Schema;
  dataTypeOptions: OptionValue[];
  showAddFieldModal: boolean;
  addFieldFormErrors: string[] | null;
  mostRecentIndexJob: IndexJob;
  fieldCoercionErrors: FieldCoercionErrors;
  newFieldType: string;
  rawFieldName: string;
  formUnchanged: boolean;
  dataLoading: boolean;
}

interface SchemaResponseProps {
  schema: Schema;
  mostRecentIndexJob: IndexJob;
}

export interface SchemaInitialData extends SchemaResponseProps {
  sourceId: string;
}

interface SchemaChangeErrorsProps {
  fieldCoercionErrors: FieldCoercionErrors;
}

export const dataTypeOptions = [
  { value: 'text', text: 'Text' },
  { value: 'date', text: 'Date' },
  { value: 'number', text: 'Number' },
  { value: 'geolocation', text: 'Geo Location' },
];

export const SchemaLogic = kea<MakeLogicType<SchemaValues, SchemaActions>>({
  actions: {
    onInitializeSchema: (schemaProps: SchemaInitialData) => schemaProps,
    onInitializeSchemaFieldErrors: (fieldCoercionErrorsProps: SchemaChangeErrorsProps) =>
      fieldCoercionErrorsProps,
    onSchemaSetSuccess: (schemaProps: SchemaResponseProps) => schemaProps,
    onSchemaSetFormErrors: (errors: string[]) => errors,
    updateNewFieldType: (newFieldType: string) => newFieldType,
    onFieldUpdate: ({ schema, formUnchanged }: { schema: Schema; formUnchanged: boolean }) => ({
      schema,
      formUnchanged,
    }),
    onIndexingComplete: (numDocumentsWithErrors: number) => numDocumentsWithErrors,
    resetMostRecentIndexJob: (emptyReindexJob: IndexJob) => emptyReindexJob,
    setFieldName: (rawFieldName: string) => rawFieldName,
    setFilterValue: (filterValue: string) => filterValue,
    openAddFieldModal: () => true,
    closeAddFieldModal: () => true,
    resetSchemaState: () => true,
    initializeSchema: () => true,
    initializeSchemaFieldErrors: (activeReindexJobId: string, sourceId: string) => ({
      activeReindexJobId,
      sourceId,
    }),
    addNewField: (fieldName: string, newFieldType: SchemaType) => ({ fieldName, newFieldType }),
    updateExistingFieldType: (fieldName: string, newFieldType: string) => ({
      fieldName,
      newFieldType,
    }),
    updateFields: () => true,
    setServerField: (updatedSchema: Schema, operation: TOperation) => ({
      updatedSchema,
      operation,
    }),
  },
  reducers: {
    dataTypeOptions: [dataTypeOptions],
    sourceId: [
      '',
      {
        onInitializeSchema: (_, { sourceId }) => sourceId,
      },
    ],
    activeSchema: [
      {},
      {
        onInitializeSchema: (_, { schema }) => schema,
        onSchemaSetSuccess: (_, { schema }) => schema,
        onFieldUpdate: (_, { schema }) => schema,
      },
    ],
    serverSchema: [
      {},
      {
        onInitializeSchema: (_, { schema }) => schema,
        onSchemaSetSuccess: (_, { schema }) => schema,
      },
    ],
    mostRecentIndexJob: [
      {} as IndexJob,
      {
        onInitializeSchema: (_, { mostRecentIndexJob }) => mostRecentIndexJob,
        resetMostRecentIndexJob: (_, emptyReindexJob) => emptyReindexJob,
        onSchemaSetSuccess: (_, { mostRecentIndexJob }) => mostRecentIndexJob,
        onIndexingComplete: (state, numDocumentsWithErrors) => ({
          ...state,
          numDocumentsWithErrors,
          percentageComplete: 100,
          hasErrors: numDocumentsWithErrors > 0,
          isActive: false,
        }),
        updateFields: (state) => ({
          ...state,
          percentageComplete: 0,
        }),
      },
    ],
    newFieldType: [
      SchemaType.Text,
      {
        updateNewFieldType: (_, newFieldType) => newFieldType,
        onSchemaSetSuccess: () => SchemaType.Text,
      },
    ],
    addFieldFormErrors: [
      null,
      {
        onSchemaSetSuccess: () => null,
        closeAddFieldModal: () => null,
        onSchemaSetFormErrors: (_, addFieldFormErrors) => addFieldFormErrors,
      },
    ],
    filterValue: [
      '',
      {
        setFilterValue: (_, filterValue) => filterValue,
      },
    ],
    formUnchanged: [
      true,
      {
        onSchemaSetSuccess: () => true,
        onFieldUpdate: (_, { formUnchanged }) => formUnchanged,
      },
    ],
    showAddFieldModal: [
      false,
      {
        onSchemaSetSuccess: () => false,
        openAddFieldModal: () => true,
        closeAddFieldModal: () => false,
      },
    ],
    dataLoading: [
      true,
      {
        onSchemaSetSuccess: () => false,
        onInitializeSchema: () => false,
        resetSchemaState: () => true,
      },
    ],
    rawFieldName: [
      '',
      {
        setFieldName: (_, rawFieldName) => rawFieldName,
        onSchemaSetSuccess: () => '',
      },
    ],
    fieldCoercionErrors: [
      {},
      {
        onInitializeSchemaFieldErrors: (_, { fieldCoercionErrors }) => fieldCoercionErrors,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    filteredSchemaFields: [
      () => [selectors.activeSchema, selectors.filterValue],
      (activeSchema, filterValue) => {
        const filteredSchema = {} as Schema;
        Object.keys(activeSchema)
          .filter((x) => x.includes(filterValue))
          .forEach((k) => (filteredSchema[k] = activeSchema[k]));
        return filteredSchema;
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeSchema: async () => {
      const { isOrganization } = AppLogic.values;
      const { http } = HttpLogic.values;
      const {
        contentSource: { id: sourceId },
      } = SourceLogic.values;

      const route = isOrganization
        ? `/internal/workplace_search/org/sources/${sourceId}/schemas`
        : `/internal/workplace_search/account/sources/${sourceId}/schemas`;

      try {
        const response = await http.get<SchemaInitialData>(route);
        // TODO: fix
        // @ts-expect-error TS2783
        actions.onInitializeSchema({ sourceId, ...response });
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initializeSchemaFieldErrors: async ({ activeReindexJobId, sourceId }) => {
      const { isOrganization } = AppLogic.values;
      const { http } = HttpLogic.values;
      const route = isOrganization
        ? `/internal/workplace_search/org/sources/${sourceId}/reindex_job/${activeReindexJobId}`
        : `/internal/workplace_search/account/sources/${sourceId}/reindex_job/${activeReindexJobId}`;

      try {
        await actions.initializeSchema();
        const response = await http.get<SchemaChangeErrorsProps>(route);
        actions.onInitializeSchemaFieldErrors({
          fieldCoercionErrors: response.fieldCoercionErrors,
        });
      } catch (e) {
        setErrorMessage(SCHEMA_FIELD_ERRORS_ERROR_MESSAGE);
      }
    },
    addNewField: ({ fieldName, newFieldType }) => {
      if (fieldName in values.activeSchema) {
        window.scrollTo(0, 0);
        actions.onSchemaSetFormErrors([
          i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.newFieldExists.message',
            {
              defaultMessage: 'New field already exists: {fieldName}.',
              values: { fieldName },
            }
          ),
        ]);
      } else {
        const schema = cloneDeep(values.activeSchema);
        schema[fieldName] = newFieldType;
        actions.setServerField(schema, ADD);
      }
    },
    updateExistingFieldType: ({ fieldName, newFieldType }) => {
      const schema = cloneDeep(values.activeSchema);
      schema[fieldName] = newFieldType;
      actions.onFieldUpdate({ schema, formUnchanged: isEqual(values.serverSchema, schema) });
    },
    updateFields: () => actions.setServerField(values.activeSchema, UPDATE),
    setServerField: async ({ updatedSchema, operation }) => {
      const { isOrganization } = AppLogic.values;
      const { http } = HttpLogic.values;
      const isAdding = operation === ADD;
      const { sourceId } = values;
      const successMessage = isAdding ? SCHEMA_FIELD_ADDED_MESSAGE : SCHEMA_UPDATED_MESSAGE;
      const route = isOrganization
        ? `/internal/workplace_search/org/sources/${sourceId}/schemas`
        : `/internal/workplace_search/account/sources/${sourceId}/schemas`;

      const emptyReindexJob = {
        percentageComplete: 100,
        numDocumentsWithErrors: 0,
        activeReindexJobId: '',
        isActive: false,
      };

      actions.resetMostRecentIndexJob(emptyReindexJob);

      try {
        const response = await http.post<SchemaResponseProps>(route, {
          body: JSON.stringify({ ...updatedSchema }),
        });
        actions.onSchemaSetSuccess(response);
        flashSuccessToast(successMessage);
      } catch (e) {
        window.scrollTo(0, 0);
        if (isAdding) {
          // We expect body.attributes.errors to be a string[] for actions.onSchemaSetFormErrors
          const message: string[] = e?.body?.attributes?.errors || [defaultErrorMessage];
          actions.onSchemaSetFormErrors(message);
        } else {
          flashAPIErrors(e);
        }
      }
    },
    resetMostRecentIndexJob: () => {
      clearFlashMessages();
    },
    resetSchemaState: () => {
      clearFlashMessages();
    },
  }),
});
