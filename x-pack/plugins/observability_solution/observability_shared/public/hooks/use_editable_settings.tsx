/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo, useState } from 'react';
import { IUiSettingsClient, UiSettingsType } from '@kbn/core/public';
import { isEmpty } from 'lodash';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import type {
  FieldDefinition,
  OnFieldChangeFn,
  UiSettingMetadata,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';
import { normalizeSettings } from '@kbn/management-settings-utilities';

function getSettingsFields({
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
  const normalizedSettings = normalizeSettings(uiSettingsDefinition);
  const fields: Record<string, FieldDefinition> = {};

  settingsKeys.forEach((key) => {
    const setting: UiSettingMetadata = normalizedSettings[key];
    if (setting) {
      const field = getFieldDefinition({
        id: key,
        setting,
        params: { isCustom: uiSettings.isCustom(key), isOverridden: uiSettings.isOverridden(key) },
      });
      fields[key] = field;
    }
  });
  return fields;
}

export function useEditableSettings(settingsKeys: string[]) {
  const {
    services: { settings },
  } = useKibana();

  const [isSaving, setIsSaving] = useState(false);
  const [forceReloadSettings, setForceReloadSettings] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = React.useState<Record<string, UnsavedFieldChange>>(
    {}
  );

  const fields = useMemo(
    () => {
      return getSettingsFields({ settingsKeys, uiSettings: settings?.client });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, settingsKeys, forceReloadSettings]
  );

  const handleFieldChange: OnFieldChangeFn = (id, change) => {
    if (!change) {
      const { [id]: unsavedChange, ...rest } = unsavedChanges;
      setUnsavedChanges(rest);
      return;
    }
    setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
  };

  function cleanUnsavedChanges() {
    setUnsavedChanges({});
  }

  async function saveAll() {
    if (settings && !isEmpty(unsavedChanges)) {
      try {
        setIsSaving(true);
        const arr = Object.entries(unsavedChanges).map(([key, value]) =>
          settings.client.set(key, value.unsavedValue)
        );
        await Promise.all(arr);
        setForceReloadSettings((state) => ++state);
        cleanUnsavedChanges();
      } finally {
        setIsSaving(false);
      }
    }
  }

  async function saveSingleSetting(
    id: string,
    change: UnsavedFieldChange<UiSettingsType>['unsavedValue']
  ) {
    if (settings) {
      try {
        setIsSaving(true);
        await settings.client.set(id, change);
        setForceReloadSettings((state) => ++state);
      } finally {
        setIsSaving(false);
      }
    }
  }

  return {
    fields,
    unsavedChanges,
    handleFieldChange,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
    saveSingleSetting,
  };
}
