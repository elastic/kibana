/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useMemo, useState } from 'react';
import { FieldState } from '@kbn/advanced-settings-plugin/public';
import { toEditableConfig } from '@kbn/advanced-settings-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';

type EditableConfig = Record<string, ReturnType<typeof toEditableConfig>>;

function getEditableConfig({
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

export function useApmEditableSettings(settingsKeys: string[]) {
  const { services } = useKibana();
  const [unsavedChanges, setUnsavedChanges] = useState<
    Record<string, FieldState>
  >({});

  const settingsEditableConfig = useMemo(() => {
    return getEditableConfig({ settingsKeys, uiSettings: services.uiSettings });
  }, [services.uiSettings, settingsKeys]);

  function handleFieldChange(key: string, fieldState: FieldState) {
    setUnsavedChanges((state) => {
      const newState = { ...state };
      const { value, defVal } = settingsEditableConfig[key];
      const currentValue = value === undefined ? defVal : value;
      if (currentValue === fieldState.value) {
        // Delete property from unsaved object if user changes it to the value that was already saved
        delete newState[key];
      } else {
        newState[key] = fieldState;
      }
      return newState;
    });
  }

  return {
    settingsEditableConfig,
    unsavedChanges,
    handleFieldChange,
  };
}
