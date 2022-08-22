/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEditableConfig } from '@kbn/advanced-settings-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';

type EditableConfig = Record<string, ReturnType<typeof toEditableConfig>>;

export function getEditableConfig({
  settingsKeys,
  uiSettings,
}: {
  settingsKeys: string[];
  uiSettings?: IUiSettingsClient;
}) {
  if (!uiSettings) {
    return {};
  }
  const uiSettingsDefinition = uiSettings.getAll();
  const config: EditableConfig = {};

  settingsKeys.forEach((key) => {
    const settingDef = uiSettingsDefinition?.[key];
    if (settingDef) {
      const editableConfig = toEditableConfig({
        def: settingDef,
        name: key,
        value: settingDef.userValue,
        isCustom: uiSettings.isCustom(key),
        isOverridden: uiSettings.isOverridden(key),
      });
      config[key] = editableConfig;
    }
  });
  return config;
}
