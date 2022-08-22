/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LazyField } from '@kbn/advanced-settings-plugin/public';
import { IToasts } from '@kbn/core-notifications-browser';
import { DocLinks } from '@kbn/doc-links';
import {
  apmLabsButton,
  apmProgressiveLoading,
  apmServiceGroupMaxNumberOfServices,
  defaultApmServiceEnvironment,
  enableComparisonByDefault,
  enableInspectEsQueries,
} from '@kbn/observability-plugin/common';
import React from 'react';
import { useApmEditableSettings } from '../../../../hooks/use_apm_editable_settings';

const apmSettingsKeys = [
  enableComparisonByDefault,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  apmServiceGroupMaxNumberOfServices,
  enableInspectEsQueries,
  apmLabsButton,
];

export function GeneralSettings() {
  const { handleFieldChange, settingsEditableConfig, unsavedChanges } =
    useApmEditableSettings(apmSettingsKeys);

  return (
    <>
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
    </>
  );
}
