/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Schema, SchemaConflicts } from '../../../../shared/types';

import {
  FieldResultSetting,
  FieldResultSettingObject,
  OpenModal,
  ServerFieldResultSettingObject,
} from '../types';

import {
  areFieldsAtDefaultSettings,
  clearAllFields,
  clearAllServerFields,
  convertServerResultFieldsToResultFields,
  convertToServerFieldResultSetting,
  resetAllFields,
  resetAllServerFields,
  splitResultFields,
} from './helpers';

interface ResultSettingsActions {
  openConfirmResetModal(): void;
  openConfirmSaveModal(): void;
  closeModals(): void;
  initializeResultFields(
    serverResultFields: ServerFieldResultSettingObject,
    schema: Schema,
    schemaConflicts?: SchemaConflicts
  ): {
    serverResultFields: ServerFieldResultSettingObject;
    resultFields: FieldResultSettingObject;
    schema: Schema;
    schemaConflicts: SchemaConflicts;
    nonTextResultFields: FieldResultSettingObject;
    textResultFields: FieldResultSettingObject;
  };
  clearAllFields(): void;
  resetAllFields(): void;
  updateField(
    fieldName: string,
    settings: FieldResultSetting
  ): { fieldName: string; settings: FieldResultSetting };
  saving(): void;
}

interface ResultSettingsValues {
  dataLoading: boolean;
  saving: boolean;
  openModal: OpenModal;
  nonTextResultFields: FieldResultSettingObject;
  textResultFields: FieldResultSettingObject;
  resultFields: FieldResultSettingObject;
  serverResultFields: ServerFieldResultSettingObject;
  lastSavedResultFields: FieldResultSettingObject;
  schema: Schema;
  schemaConflicts: SchemaConflicts;
}

export const ResultSettingsLogic = kea<MakeLogicType<ResultSettingsValues, ResultSettingsActions>>({
  path: ['enterprise_search', 'app_search', 'result_settings_logic'],
  actions: () => ({
    openConfirmResetModal: () => true,
    openConfirmSaveModal: () => true,
    closeModals: () => true,
    initializeResultFields: (serverResultFields, schema, schemaConflicts) => {
      const resultFields = convertServerResultFieldsToResultFields(serverResultFields, schema);
      for (const fieldName of Object.keys(schema)) {
        if (!(fieldName in serverResultFields)) {
          serverResultFields[fieldName] = {};
        }
      }
      return {
        serverResultFields,
        resultFields,
        schema,
        schemaConflicts,
        ...splitResultFields(resultFields, schema),
      };
    },
    clearAllFields: () => true,
    resetAllFields: () => true,
    updateField: (fieldName, settings) => ({ fieldName, settings }),
    saving: () => true,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        initializeResultFields: () => false,
      },
    ],
    saving: [
      false,
      {
        initializeResultFields: () => false,
        saving: () => true,
      },
    ],
    openModal: [
      OpenModal.None,
      {
        initializeResultFields: (_, { resultFields }: { resultFields: FieldResultSettingObject }) =>
          areFieldsAtDefaultSettings(resultFields) ? OpenModal.ConfirmModifyModal : OpenModal.None,
        closeModals: () => OpenModal.None,
        resetAllFields: () => OpenModal.None,
        openConfirmResetModal: () => OpenModal.ConfirmResetModal,
        openConfirmSaveModal: () => OpenModal.ConfirmSaveModal,
        saving: () => OpenModal.None,
      },
    ],
    nonTextResultFields: [
      {},
      {
        initializeResultFields: (
          _,
          { nonTextResultFields }: { nonTextResultFields: FieldResultSettingObject }
        ) => nonTextResultFields,
        clearAllFields: (nonTextResultFields) => clearAllFields(nonTextResultFields),
        resetAllFields: (nonTextResultFields) => resetAllFields(nonTextResultFields),
        updateField: (nonTextResultFields, { fieldName, settings }) =>
          fieldName in nonTextResultFields
            ? { ...nonTextResultFields, [fieldName]: settings }
            : nonTextResultFields,
      },
    ],
    textResultFields: [
      {},
      {
        initializeResultFields: (
          _,
          { textResultFields }: { textResultFields: FieldResultSettingObject }
        ) => textResultFields,
        clearAllFields: (textResultFields) => clearAllFields(textResultFields),
        resetAllFields: (textResultFields) => resetAllFields(textResultFields),
        updateField: (textResultFields, { fieldName, settings }) =>
          fieldName in textResultFields
            ? { ...textResultFields, [fieldName]: settings }
            : textResultFields,
      },
    ],
    resultFields: [
      {},
      {
        initializeResultFields: (_, { resultFields }: { resultFields: FieldResultSettingObject }) =>
          resultFields,
        clearAllFields: (resultFields) => clearAllFields(resultFields),
        resetAllFields: (resultFields) => resetAllFields(resultFields),
        updateField: (resultFields, { fieldName, settings }) =>
          fieldName in resultFields ? { ...resultFields, [fieldName]: settings } : resultFields,
      },
    ],
    serverResultFields: [
      {},
      {
        initializeResultFields: (
          _,
          { serverResultFields }: { serverResultFields: ServerFieldResultSettingObject }
        ) => serverResultFields,
        clearAllFields: (serverResultFields) => clearAllServerFields(serverResultFields),
        resetAllFields: (serverResultFields) => resetAllServerFields(serverResultFields),
        updateField: (serverResultFields, { fieldName, settings }) => {
          return fieldName in serverResultFields
            ? {
                ...serverResultFields,
                [fieldName]: convertToServerFieldResultSetting(settings),
              }
            : serverResultFields;
        },
      },
    ],
    lastSavedResultFields: [
      {},
      {
        initializeResultFields: (_, { resultFields }: { resultFields: FieldResultSettingObject }) =>
          resultFields,
      },
    ],
    schema: [
      {},
      {
        initializeResultFields: (_, { schema }) => schema,
      },
    ],
    schemaConflicts: [
      {},
      {
        initializeResultFields: (_, { schemaConflicts }) => schemaConflicts || {},
      },
    ],
  }),
});
