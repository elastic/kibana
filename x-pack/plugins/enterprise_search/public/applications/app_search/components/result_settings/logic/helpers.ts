/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FIELD_SETTINGS } from '../constants';
import {
  FieldResultSetting,
  FieldResultSettingObject,
  ServerFieldResultSetting,
  ServerFieldResultSettingObject,
} from '../types';

const updateAllFields = (
  fields: FieldResultSettingObject | ServerFieldResultSettingObject,
  newValue: FieldResultSetting | {}
) => {
  return Object.keys(fields).reduce(
    (acc, fieldName) => ({ ...acc, [fieldName]: { ...newValue } }),
    {}
  );
};

export const clearAllServerFields = (fields: ServerFieldResultSettingObject) =>
  updateAllFields(fields, {});

export const clearAllFields = (fields: FieldResultSettingObject) => updateAllFields(fields, {});

export const resetAllServerFields = (fields: ServerFieldResultSettingObject) =>
  updateAllFields(fields, { raw: {} });

export const resetAllFields = (fields: FieldResultSettingObject) =>
  updateAllFields(fields, DEFAULT_FIELD_SETTINGS);

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
