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
import { isEmpty } from 'lodash';
import { useUiTracker } from '@kbn/observability-plugin/public';

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
  const config: Record<string, ReturnType<typeof toEditableConfig>> = {};

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
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { uiSettings } = services;
  const [isSaving, setIsSaving] = useState(false);
  const [forceReloadSettings, setForceReloadSettings] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState<
    Record<string, FieldState>
  >({});

  const settingsEditableConfig = useMemo(
    () => {
      return getEditableConfig({ settingsKeys, uiSettings });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uiSettings, settingsKeys, forceReloadSettings]
  );

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

  function cleanUnsavedChanges() {
    setUnsavedChanges({});
  }

  async function saveAll({ trackMetricName }: { trackMetricName: string }) {
    if (uiSettings && !isEmpty(unsavedChanges)) {
      try {
        setIsSaving(true);
        const arr = Object.entries(unsavedChanges).map(([key, fieldState]) =>
          uiSettings.set(key, fieldState.value)
        );

        await Promise.all(arr);
        trackApmEvent({ metric: trackMetricName });
        setForceReloadSettings((state) => ++state);
        cleanUnsavedChanges();
      } finally {
        setIsSaving(false);
      }
    }
  }

  return {
    settingsEditableConfig,
    unsavedChanges,
    handleFieldChange,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
  };
}
