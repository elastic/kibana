/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

import { AdvancedSchema, SchemaType } from '../../../shared/schema/types';

import { DEFAULT_FIELD_SETTINGS, DISABLED_FIELD_SETTINGS } from './constants';
import {
  FieldResultSetting,
  FieldResultSettingObject,
  ServerFieldResultSetting,
  ServerFieldResultSettingObject,
} from './types';

const updateAllFields = (
  fields: FieldResultSettingObject | ServerFieldResultSettingObject,
  newValue: FieldResultSetting | {}
) => {
  return Object.keys(fields).reduce(
    (acc, fieldName) => ({ ...acc, [fieldName]: { ...newValue } }),
    {}
  );
};

const convertToFieldResultSetting = (serverFieldResultSetting: ServerFieldResultSetting) => {
  const fieldResultSetting: FieldResultSetting = {
    raw: !!serverFieldResultSetting.raw,
    snippet: !!serverFieldResultSetting.snippet,
    snippetFallback: !!(
      serverFieldResultSetting.snippet &&
      typeof serverFieldResultSetting.snippet === 'object' &&
      serverFieldResultSetting.snippet.fallback
    ),
  };

  if (
    serverFieldResultSetting.raw &&
    typeof serverFieldResultSetting.raw === 'object' &&
    serverFieldResultSetting.raw.size
  ) {
    fieldResultSetting.rawSize = serverFieldResultSetting.raw.size;
  }

  if (
    serverFieldResultSetting.snippet &&
    typeof serverFieldResultSetting.snippet === 'object' &&
    serverFieldResultSetting.snippet.size
  ) {
    fieldResultSetting.snippetSize = serverFieldResultSetting.snippet.size;
  }

  return fieldResultSetting;
};

export const clearAllFields = (fields: FieldResultSettingObject) => updateAllFields(fields, {});

export const resetAllFields = (fields: FieldResultSettingObject) =>
  updateAllFields(fields, DEFAULT_FIELD_SETTINGS);

export const convertServerResultFieldsToResultFields = (
  serverResultFields: ServerFieldResultSettingObject,
  schema: AdvancedSchema
) => {
  const resultFields: FieldResultSettingObject = Object.keys(schema).reduce(
    (acc: FieldResultSettingObject, fieldName: string) => ({
      ...acc,
      [fieldName]: serverResultFields[fieldName]
        ? convertToFieldResultSetting(serverResultFields[fieldName])
        : DISABLED_FIELD_SETTINGS,
    }),
    {}
  );
  return resultFields;
};

export const convertToServerFieldResultSetting = (fieldResultSetting: FieldResultSetting) => {
  const serverFieldResultSetting: ServerFieldResultSetting = {};
  if (fieldResultSetting.raw) {
    serverFieldResultSetting.raw = {};
    if (fieldResultSetting.rawSize) {
      serverFieldResultSetting.raw.size = fieldResultSetting.rawSize;
    }
  }

  if (fieldResultSetting.snippet) {
    serverFieldResultSetting.snippet = {};
    if (fieldResultSetting.snippetFallback) {
      serverFieldResultSetting.snippet.fallback = fieldResultSetting.snippetFallback;
    }
    if (fieldResultSetting.snippetSize) {
      serverFieldResultSetting.snippet.size = fieldResultSetting.snippetSize;
    }
  }

  return serverFieldResultSetting;
};

export const splitResultFields = (resultFields: FieldResultSettingObject, schema: AdvancedSchema) =>
  Object.entries(resultFields).reduce(
    (acc, [fieldName, resultFieldSettings]) => {
      const fieldType = schema[fieldName].type;
      const targetField =
        fieldType === SchemaType.Text ? 'textResultFields' : 'nonTextResultFields';
      return { ...acc, [targetField]: { ...acc[targetField], [fieldName]: resultFieldSettings } };
    },
    { textResultFields: {}, nonTextResultFields: {} }
  );

export const areFieldsEmpty = (fields: FieldResultSettingObject) => {
  const anyNonEmptyField = Object.values(fields).find((field) => {
    return (field as FieldResultSetting).raw || (field as FieldResultSetting).snippet;
  });
  return !anyNonEmptyField;
};

export const areFieldsAtDefaultSettings = (fields: FieldResultSettingObject) => {
  const anyNonDefaultSettingsValue = Object.values(fields).find((resultSettings) => {
    return !isEqual(resultSettings, DEFAULT_FIELD_SETTINGS);
  });
  return !anyNonDefaultSettingsValue;
};
