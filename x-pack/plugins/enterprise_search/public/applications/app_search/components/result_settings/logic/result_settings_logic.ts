/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { FieldResultSettingObject, OpenModal, ServerFieldResultSettingObject } from '../types';

import {
  clearAllFields,
  clearAllServerFields,
  resetAllFields,
  resetAllServerFields,
} from './helpers';

interface ResultSettingsActions {
  clearAllFields(): void;
  resetAllFields(): void;
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
    clearAllFields: () => true,
    resetAllFields: () => true,
  }),
  reducers: () => ({
    openModal: [
      OpenModal.None,
      {
        resetAllFields: () => OpenModal.None,
      },
    ],
    nonTextResultFields: [
      {},
      {
        clearAllFields: (nonTextResultFields) => clearAllFields(nonTextResultFields),
        resetAllFields: (nonTextResultFields) => resetAllFields(nonTextResultFields),
      },
    ],
    textResultFields: [
      {},
      {
        clearAllFields: (textResultFields) => clearAllFields(textResultFields),
        resetAllFields: (textResultFields) => resetAllFields(textResultFields),
      },
    ],
    resultFields: [
      {},
      {
        clearAllFields: (resultFields) => clearAllFields(resultFields),
        resetAllFields: (resultFields) => resetAllFields(resultFields),
      },
    ],
    serverResultFields: [
      {},
      {
        clearAllFields: (serverResultFields) => clearAllServerFields(serverResultFields),
        resetAllFields: (serverResultFields) => resetAllServerFields(serverResultFields),
      },
    ],
  }),
});
