/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import {
  FieldState,
  LazyField,
  toEditableConfig,
} from '@kbn/advanced-settings-plugin/public';
import { IToasts } from '@kbn/core-notifications-browser';
import { IUiSettingsClient } from '@kbn/core/public';
import { DocLinks } from '@kbn/doc-links';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  apmOperationsTab,
  apmProgressiveLoading,
  apmServiceGroupMaxNumberOfServices,
  apmServiceInventoryOptimizedSorting,
  apmTraceExplorerTab,
  defaultApmServiceEnvironment,
  enableComparisonByDefault,
  enableInspectEsQueries,
  enableServiceGroups,
  apmLabsButton,
} from '@kbn/observability-plugin/common';
import React, { useMemo, useState } from 'react';

const experimentalFeatureKeys = [
  apmTraceExplorerTab,
  enableServiceGroups,
  apmServiceInventoryOptimizedSorting,
  apmOperationsTab,
];

const apmSettingsKeys = [
  enableComparisonByDefault,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  apmServiceGroupMaxNumberOfServices,
  enableInspectEsQueries,
  apmLabsButton,
];

type Config = Record<string, ReturnType<typeof toEditableConfig>>;

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
  const config: Config = {};

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

export function GeneralSettings() {
  const [experimentalMode, setExperimentalMode] = useState(false);

  const { services } = useKibana();

  const [unsavedChanges, setUnsavedChanges] = useState<
    Record<string, FieldState>
  >({});

  const settingsEditableConfig = useMemo(() => {
    return getEditableConfig({
      settingsKeys: [...experimentalFeatureKeys, ...apmSettingsKeys],
      uiSettings: services.uiSettings,
    });
  }, [services.uiSettings]);

  function handleExperimentalModeChange(checked: boolean) {
    setExperimentalMode(checked);

    experimentalFeatureKeys.forEach((experimentalKey) => {
      handleFieldChange(experimentalKey, { value: checked });
    });
  }

  function handleFieldChange(key: string, fieldState: FieldState) {
    setUnsavedChanges((state) => {
      const newState = { ...state };
      const editableConfig = settingsEditableConfig[key];
      if (editableConfig.defVal === fieldState.value) {
        delete newState[key];
      } else {
        newState[key] = fieldState;
      }
      return newState;
    });
  }

  return (
    <div>
      <EuiPanel>
        <EuiSwitch
          label={<EuiText>One setting to rule them all</EuiText>}
          checked={experimentalMode}
          onChange={(e) => handleExperimentalModeChange(e.target.checked)}
        />
        <EuiSpacer />
        {experimentalFeatureKeys.map((settingKey) => {
          const editableConfig = settingsEditableConfig[settingKey];
          return (
            <LazyField
              key={settingKey}
              setting={editableConfig}
              handleChange={handleFieldChange}
              enableSaving
              docLinks={{} as DocLinks}
              toasts={{} as IToasts}
              unsavedChanges={unsavedChanges[settingKey]}
            />
          );
        })}
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel>
        {apmSettingsKeys.map((settingKey) => {
          const editableConfig = settingsEditableConfig[settingKey];
          return (
            <LazyField
              key={settingKey}
              setting={editableConfig}
              handleChange={handleFieldChange}
              enableSaving
              docLinks={{} as DocLinks}
              toasts={{} as IToasts}
              unsavedChanges={unsavedChanges[settingKey]}
            />
          );
        })}
      </EuiPanel>
    </div>
  );
}
