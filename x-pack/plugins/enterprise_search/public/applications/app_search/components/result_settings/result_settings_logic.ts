/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { omit, isEqual } from 'lodash';

import { i18n } from '@kbn/i18n';

import { flashAPIErrors, setSuccessMessage } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { Schema, SchemaConflicts } from '../../../shared/types';
import { EngineLogic } from '../engine';

import { DEFAULT_SNIPPET_SIZE } from './constants';
import {
  FieldResultSetting,
  FieldResultSettingObject,
  OpenModal,
  ServerFieldResultSettingObject,
} from './types';

import {
  areFieldsAtDefaultSettings,
  areFieldsEmpty,
  clearAllFields,
  clearAllServerFields,
  convertServerResultFieldsToResultFields,
  convertToServerFieldResultSetting,
  resetAllFields,
  resetAllServerFields,
  splitResultFields,
} from './utils';

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
    settings: FieldResultSetting | {}
  ): { fieldName: string; settings: FieldResultSetting };
  saving(): void;
  // Listeners
  clearRawSizeForField(fieldName: string): string;
  clearSnippetSizeForField(fieldName: string): string;
  toggleRawForField(fieldName: string): string;
  toggleSnippetForField(fieldName: string): string;
  toggleSnippetFallbackForField(fieldName: string): string;
  updateRawSizeForField(fieldName: string, size: number): { fieldName: string; size: number };
  updateSnippetSizeForField(fieldName: string, size: number): { fieldName: string; size: number };
  initializeResultSettingsData(): void;
  saveResultSettings(resultFields: ServerFieldResultSettingObject): ServerFieldResultSettingObject;
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
  // Selectors
  resultFieldsAtDefaultSettings: boolean;
  resultFieldsEmpty: boolean;
  stagedUpdates: true;
  reducedServerResultFields: ServerFieldResultSettingObject;
}

export const ResultSettingsLogic = kea<MakeLogicType<ResultSettingsValues, ResultSettingsActions>>({
  path: ['enterprise_search', 'app_search', 'result_settings_logic'],
  actions: () => ({
    openConfirmResetModal: () => true,
    openConfirmSaveModal: () => true,
    closeModals: () => true,
    initializeResultFields: (serverResultFields, schema, schemaConflicts) => {
      const resultFields = convertServerResultFieldsToResultFields(serverResultFields, schema);
      Object.keys(schema).forEach((fieldName) => {
        if (!serverResultFields.hasOwnProperty(fieldName)) {
          serverResultFields[fieldName] = {};
        }
      });

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
    clearRawSizeForField: (fieldName) => fieldName,
    clearSnippetSizeForField: (fieldName) => fieldName,
    toggleRawForField: (fieldName) => fieldName,
    toggleSnippetForField: (fieldName) => fieldName,
    toggleSnippetFallbackForField: (fieldName) => fieldName,
    updateRawSizeForField: (fieldName, size) => ({ fieldName, size }),
    updateSnippetSizeForField: (fieldName, size) => ({ fieldName, size }),
    initializeResultSettingsData: () => true,
    saveResultSettings: (resultFields) => resultFields,
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
        initializeResultFields: () => OpenModal.None,
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
        initializeResultFields: (_, { nonTextResultFields }) => nonTextResultFields,
        clearAllFields: (nonTextResultFields) => clearAllFields(nonTextResultFields),
        resetAllFields: (nonTextResultFields) => resetAllFields(nonTextResultFields),
        updateField: (nonTextResultFields, { fieldName, settings }) =>
          nonTextResultFields.hasOwnProperty(fieldName)
            ? { ...nonTextResultFields, [fieldName]: settings }
            : nonTextResultFields,
      },
    ],
    textResultFields: [
      {},
      {
        initializeResultFields: (_, { textResultFields }) => textResultFields,
        clearAllFields: (textResultFields) => clearAllFields(textResultFields),
        resetAllFields: (textResultFields) => resetAllFields(textResultFields),
        updateField: (textResultFields, { fieldName, settings }) =>
          textResultFields.hasOwnProperty(fieldName)
            ? { ...textResultFields, [fieldName]: settings }
            : textResultFields,
      },
    ],
    resultFields: [
      {},
      {
        initializeResultFields: (_, { resultFields }) => resultFields,
        clearAllFields: (resultFields) => clearAllFields(resultFields),
        resetAllFields: (resultFields) => resetAllFields(resultFields),
        updateField: (resultFields, { fieldName, settings }) =>
          resultFields.hasOwnProperty(fieldName)
            ? { ...resultFields, [fieldName]: settings }
            : resultFields,
      },
    ],
    serverResultFields: [
      {},
      {
        initializeResultFields: (_, { serverResultFields }) => serverResultFields,
        clearAllFields: (serverResultFields) => clearAllServerFields(serverResultFields),
        resetAllFields: (serverResultFields) => resetAllServerFields(serverResultFields),
        updateField: (serverResultFields, { fieldName, settings }) => {
          return serverResultFields.hasOwnProperty(fieldName)
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
        initializeResultFields: (_, { resultFields }) => resultFields,
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
  selectors: ({ selectors }) => ({
    resultFieldsAtDefaultSettings: [
      () => [selectors.resultFields],
      (resultFields: FieldResultSettingObject) => areFieldsAtDefaultSettings(resultFields),
    ],
    resultFieldsEmpty: [
      () => [selectors.resultFields],
      (resultFields: FieldResultSettingObject) => areFieldsEmpty(resultFields),
    ],
    stagedUpdates: [
      () => [selectors.lastSavedResultFields, selectors.resultFields],
      (lastSavedResultFields: FieldResultSettingObject, resultFields: FieldResultSettingObject) =>
        !isEqual(lastSavedResultFields, resultFields),
    ],
    reducedServerResultFields: [
      () => [selectors.serverResultFields],
      (serverResultFields: ServerFieldResultSettingObject) =>
        Object.entries(serverResultFields).reduce(
          (acc: ServerFieldResultSettingObject, [fieldName, resultSetting]) => {
            if (resultSetting.raw || resultSetting.snippet) {
              acc[fieldName] = resultSetting;
            }
            return acc;
          },
          {}
        ),
    ],
  }),
  listeners: ({ actions, values }) => ({
    clearRawSizeForField: (fieldName) => {
      actions.updateField(fieldName, omit(values.resultFields[fieldName], ['rawSize']));
    },
    clearSnippetSizeForField: (fieldName) => {
      actions.updateField(fieldName, omit(values.resultFields[fieldName], ['snippetSize']));
    },
    toggleRawForField: (fieldName: string) => {
      // We cast this b/c it could be an empty object, which we can still treat as a FieldResultSetting safely
      const field = values.resultFields[fieldName] as FieldResultSetting;
      const raw = !field.raw;
      actions.updateField(fieldName, {
        ...omit(field, ['rawSize']),
        raw,
        ...(raw ? { rawSize: field.rawSize } : {}),
      });
    },
    toggleSnippetForField: (fieldName: string) => {
      // We cast this b/c it could be an empty object, which we can still treat as a FieldResultSetting safely
      const field = values.resultFields[fieldName] as FieldResultSetting;
      const snippet = !field.snippet;

      actions.updateField(fieldName, {
        ...omit(field, ['snippetSize']),
        snippet,
        ...(snippet ? { snippetSize: DEFAULT_SNIPPET_SIZE } : {}),
      });
    },
    toggleSnippetFallbackForField: (fieldName: string) => {
      // We cast this b/c it could be an empty object, which we can still treat as a FieldResultSetting safely
      const field = values.resultFields[fieldName] as FieldResultSetting;
      actions.updateField(fieldName, {
        ...field,
        snippetFallback: !field.snippetFallback,
      });
    },
    updateRawSizeForField: ({ fieldName, size }) => {
      actions.updateField(fieldName, { ...values.resultFields[fieldName], rawSize: size });
    },
    updateSnippetSizeForField: ({ fieldName, size }) => {
      actions.updateField(fieldName, { ...values.resultFields[fieldName], snippetSize: size });
    },
    initializeResultSettingsData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const url = `/api/app_search/engines/${engineName}/result_settings/details`;

      try {
        const {
          schema,
          schemaConflicts,
          searchSettings: { result_fields: serverFieldResultSettings },
        } = await http.get(url);

        actions.initializeResultFields(serverFieldResultSettings, schema, schemaConflicts);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveResultSettings: async (resultFields: ServerFieldResultSettingObject) => {
      actions.saving();

      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      const url = `/api/app_search/engines/${engineName}/result_settings`;

      actions.saving();

      let response;
      try {
        response = await http.put(url, {
          body: JSON.stringify({
            result_fields: resultFields,
          }),
        });
      } catch (e) {
        flashAPIErrors(e);
      }

      actions.initializeResultFields(response.result_fields, values.schema);
      setSuccessMessage(
        i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.saveSuccessMessage',
          {
            defaultMessage: 'Result settings have been saved successfully.',
          }
        )
      );
    },
  }),
});
