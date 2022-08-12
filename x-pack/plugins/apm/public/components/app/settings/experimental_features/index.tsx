/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LazyField,
  toEditableConfig,
} from '@kbn/advanced-settings-plugin/public';
import { IToasts } from '@kbn/core-notifications-browser';
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
  enableInfrastructureView,
  enableServiceGroups,
} from '@kbn/observability-plugin/common';
import React, { useMemo } from 'react';

const apmFields = [
  enableComparisonByDefault,
  enableInfrastructureView,
  defaultApmServiceEnvironment,
  enableServiceGroups,
  apmProgressiveLoading,
  apmServiceInventoryOptimizedSorting,
  apmServiceGroupMaxNumberOfServices,
  apmTraceExplorerTab,
  apmOperationsTab,
];

export function ExperimentalFeatures() {
  const { services } = useKibana();
  const { uiSettings } = services;
  const uiSettingsDefinition = useMemo(
    () => uiSettings?.getAll(),
    [uiSettings]
  );

  if (!uiSettings) {
    return null;
  }

  const apmSettingsEditableConfig = apmFields
    .map((key) => {
      const settingDef = uiSettingsDefinition?.[key];
      if (settingDef) {
        return toEditableConfig({
          def: settingDef,
          name: key,
          value: settingDef.userValue,
          isCustom: uiSettings.isCustom(key),
          isOverridden: uiSettings.isOverridden(key),
        });
      }
      return;
    })
    .filter((_) => _) as Array<ReturnType<typeof toEditableConfig>>;

  return (
    <div>
      {apmSettingsEditableConfig.map((editableConfig) => {
        return (
          <LazyField
            key={editableConfig.name}
            setting={editableConfig}
            handleChange={(key, { value }) => {
              console.log('### caue ~ {fields.map ~ value', key, value);
            }}
            enableSaving
            docLinks={{} as DocLinks}
            toasts={{} as IToasts}
          />
        );
      })}
    </div>
  );
}
