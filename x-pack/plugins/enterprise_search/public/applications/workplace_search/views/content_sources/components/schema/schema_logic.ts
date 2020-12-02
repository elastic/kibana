/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, isEqual } from 'lodash';
import { kea, MakeLogicType } from 'kea';

import http from 'shared/http';
import routes from 'workplace_search/routes';

import { TEXT } from '../../../../../shared/constants/field_types';
import { ADD, UPDATE } from '../../../../../shared/constants/operations';
import { IndexJob, IFlashMessagesProps, TOperation } from '../../../../../shared/types';
import { OptionValue } from '../../../../types';

import { AppLogic } from '../../../../app_logic';
import { SourceLogic } from '../../source_logic';

interface SchemaActions {
  setFlashMessages(flashMessages: IFlashMessagesProps): { flashMessages: IFlashMessagesProps };
  onInitializeSchema(schemaProps: SchemaInitialData): SchemaInitialData;
  onInitializeSchemaFieldErrors(
    fieldCoercionErrorsProps: SchemaChangeErrorsProps
  ): SchemaChangeErrorsProps;
  onSchemaSetSuccess(
    schemaProps: SchemaSetProps & SchemaResponseProps
  ): SchemaSetProps & SchemaResponseProps;
  onSchemaSetError(errorProps: SchemaSetProps): SchemaSetProps;
  onSchemaSetFormErrors(errors: string[]): string[];
  updateNewFieldType(newFieldType: string): string;
  onFieldUpdate({
    schema,
    formUnchanged,
  }: {
    schema: object;
    formUnchanged: boolean;
  }): { schema: object; formUnchanged: boolean };
  onIndexingComplete(numDocumentsWithErrors: number): number;
  resetMostRecentIndexJob(emptyReindexJob: IndexJob): IndexJob;
  showFieldSuccess(successMessage: string): string;
  setFieldName(rawFieldName: string): string;
  setFilterValue(filterValue: string): string;
  addNewField(fieldName: string, newFieldType: string): { fieldName: string; newFieldType: string };
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
    newFieldType: string
  ): { fieldName: string; newFieldType: string };
  setServerField(
    updatedSchema: object,
    operation: TOperation
  ): { updatedSchema: object; operation: TOperation };
}

interface SchemaValues {
  sourceId: string;
  activeSchema: object;
  serverSchema: object;
  filterValue: string;
  filteredSchemaFields: object;
  dataTypeOptions: OptionValue[];
  showAddFieldModal: boolean;
  addFieldFormErrors: string[] | null;
  mostRecentIndexJob: IndexJob;
  fieldCoercionErrors: FieldCoercionErrors;
  flashMessages: IFlashMessagesProps;
  newFieldType: string;
  rawFieldName: string;
  formUnchanged: boolean;
  dataLoading: boolean;
}

interface SchemaResponseProps {
  schema: object;
  mostRecentIndexJob: IndexJob;
}

export interface SchemaInitialData extends SchemaResponseProps {
  sourceId: string;
}

interface SchemaSetProps {
  flashMessages: IFlashMessagesProps;
}

interface FieldCoercionError {
  external_id: string;
  error: string;
}

export interface FieldCoercionErrors {
  [key: string]: FieldCoercionError[];
}

interface SchemaChangeErrorsProps {
  fieldCoercionErrors: FieldCoercionErrors;
}

const dataTypeOptions = [
  { value: 'text', text: 'Text' },
  { value: 'date', text: 'Date' },
  { value: 'number', text: 'Number' },
  { value: 'geolocation', text: 'Geo Location' },
];

const FIELD_ERRORS_ERROR = 'Oops, we were not able to find any errors for this Schema';

export const SchemaLogic = kea<MakeLogicType<SchemaValues, SchemaActions>>({
  actions: {
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({ flashMessages }),
    onInitializeSchema: (schemaProps: SchemaInitialData) => schemaProps,
    onInitializeSchemaFieldErrors: (fieldCoercionErrorsProps: SchemaChangeErrorsProps) =>
      fieldCoercionErrorsProps,
    onSchemaSetSuccess: (schemaProps: SchemaSetProps & SchemaResponseProps) => schemaProps,
    onSchemaSetError: (errorProps: SchemaSetProps) => errorProps,
    onSchemaSetFormErrors: (errors: string[]) => errors,
    updateNewFieldType: (newFieldType: string) => newFieldType,
    onFieldUpdate: ({ schema, formUnchanged }: { schema: object; formUnchanged: boolean }) => ({
      schema,
      formUnchanged,
    }),
    onIndexingComplete: (numDocumentsWithErrors: number) => numDocumentsWithErrors,
    resetMostRecentIndexJob: (emptyReindexJob: IndexJob) => emptyReindexJob,
    showFieldSuccess: (successMessage: string) => successMessage,
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
    addNewField: (fieldName: string, newFieldType: string) => ({ fieldName, newFieldType }),
    updateExistingFieldType: (fieldName: string, newFieldType: string) => ({
      fieldName,
      newFieldType,
    }),
    updateFields: () => true,
    setServerField: (updatedSchema: object, operation: TOperation) => ({
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
      },
    ],
    flashMessages: [
      {},
      {
        setFlashMessages: (_, { flashMessages }) => flashMessages,
        resetMostRecentIndexJob: () => ({}),
        resetSchemaState: () => ({}),
        onSchemaSetSuccess: (_, { flashMessages }) => flashMessages,
        onSchemaSetError: (_, { flashMessages }) => flashMessages,
      },
    ],
    newFieldType: [
      TEXT,
      {
        updateNewFieldType: (_, newFieldType) => newFieldType,
        onSchemaSetSuccess: () => TEXT,
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
        onSchemaSetError: () => false,
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
        const filteredSchema = {};
        Object.keys(activeSchema)
          .filter((x) => x.includes(filterValue))
          .forEach((k) => (filteredSchema[k] = activeSchema[k]));
        return filteredSchema;
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeSchema: () => {
      const { isOrganization } = AppLogic.values;
      const {
        contentSource: { id: sourceId },
      } = SourceLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourceSchemasPath(sourceId)
        : routes.fritoPieAccountContentSourceSchemasPath(sourceId);

      return http(route).then(({ data }) => actions.onInitializeSchema({ sourceId, ...data }));
    },
    initializeSchemaFieldErrors: async ({ activeReindexJobId, sourceId }) => {
      const { isOrganization } = AppLogic.values;

      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourceReindexJobPath(sourceId, activeReindexJobId)
        : routes.fritoPieAccountContentSourceReindexJobPath(sourceId, activeReindexJobId);

      try {
        await actions.initializeSchema();
        http(route).then(({ data: { fieldCoercionErrors } }) =>
          actions.onInitializeSchemaFieldErrors({ fieldCoercionErrors })
        );
      } catch (error) {
        actions.setFlashMessages({ error: [FIELD_ERRORS_ERROR] });
      }
    },
    addNewField: ({ fieldName, newFieldType }) => {
      const schema = cloneDeep(values.activeSchema);
      schema[fieldName] = newFieldType;
      actions.setServerField(schema, ADD);
    },
    updateExistingFieldType: ({ fieldName, newFieldType }) => {
      const schema = cloneDeep(values.activeSchema);
      schema[fieldName] = newFieldType;
      actions.onFieldUpdate({ schema, formUnchanged: isEqual(values.serverSchema, schema) });
    },
    updateFields: () => actions.setServerField(values.activeSchema, UPDATE),
    setServerField: ({ updatedSchema, operation }) => {
      const { isOrganization } = AppLogic.values;
      const isAdding = operation === ADD;
      const { sourceId } = values;
      const successMessage = isAdding ? 'New field added.' : 'Schema updated.';
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourceSchemasPath(sourceId)
        : routes.fritoPieAccountContentSourceSchemasPath(sourceId);

      const emptyReindexJob = {
        percentageComplete: 100,
        numDocumentsWithErrors: 0,
        activeReindexJobId: 0,
        isActive: false,
      };

      actions.resetMostRecentIndexJob(emptyReindexJob);

      http
        .post(route, updatedSchema)
        .then(({ data }) => {
          window.scrollTo(0, 0);

          actions.onSchemaSetSuccess({
            ...data,
            flashMessages: { success: [successMessage] },
          });
        })
        .catch(
          ({
            response: {
              data: { errors },
            },
          }) => {
            window.scrollTo(0, 0);
            if (isAdding) {
              actions.onSchemaSetFormErrors(errors);
            } else {
              actions.onSchemaSetError({ flashMessages: { error: errors } });
            }
          }
        );
    },
  }),
});
