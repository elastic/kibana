/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  FieldResultSetting,
  FieldResultSettingObject,
  OpenModal,
  ServerFieldResultSettingObject,
} from '../types';

import {
  clearAllFields,
  clearAllServerFields,
  convertToServerFieldResultSetting,
  resetAllFields,
  resetAllServerFields,
} from './helpers';

interface ResultSettingsActions {
  openConfirmResetModal(): void;
  openConfirmSaveModal(): void;
  closeModals(): void;
  clearAllFields(): void;
  resetAllFields(): void;
  updateField(
    fieldName: string,
    settings: FieldResultSetting
  ): { fieldName: string; settings: FieldResultSetting };
}

interface ResultSettingsValues {
  openModal: OpenModal;
  nonTextResultFields: FieldResultSettingObject;
  textResultFields: FieldResultSettingObject;
  resultFields: FieldResultSettingObject;
  serverResultFields: ServerFieldResultSettingObject;
}

export const ResultSettingsLogic = kea<MakeLogicType<ResultSettingsValues, ResultSettingsActions>>({
  path: ['enterprise_search', 'app_search', 'result_settings_logic'],
  actions: () => ({
    openConfirmResetModal: () => true,
    openConfirmSaveModal: () => true,
    closeModals: () => true,
    clearAllFields: () => true,
    resetAllFields: () => true,
    updateField: (fieldName, settings) => ({ fieldName, settings }),
  }),
  reducers: () => ({
    openModal: [
      OpenModal.None,
      {
        closeModals: () => OpenModal.None,
        resetAllFields: () => OpenModal.None,
        openConfirmResetModal: () => OpenModal.ConfirmResetModal,
        openConfirmSaveModal: () => OpenModal.ConfirmSaveModal,
      },
    ],
    nonTextResultFields: [
      {},
      {
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
        clearAllFields: (resultFields) => clearAllFields(resultFields),
        resetAllFields: (resultFields) => resetAllFields(resultFields),
        updateField: (resultFields, { fieldName, settings }) =>
          fieldName in resultFields ? { ...resultFields, [fieldName]: settings } : resultFields,
      },
    ],
    serverResultFields: [
      {},
      {
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
  }),
});
