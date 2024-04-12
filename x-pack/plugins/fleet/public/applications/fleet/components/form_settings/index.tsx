/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ZodFirstPartyTypeKind } from 'zod';
import React from 'react';
import { EuiFieldNumber, EuiFieldText } from '@elastic/eui';

import type { SettingsConfig } from '../../../../../common/settings/types';

import { SettingsFieldGroup } from './settings_field_group';
import { getInnerType, SettingsFieldWrapper } from './settings_field_wrapper';

export const settingComponentRegistry = new Map<
  string,
  (settingsconfig: SettingsConfig) => React.ReactElement
>();

settingComponentRegistry.set(ZodFirstPartyTypeKind.ZodObject, (settingsConfig) => (
  <SettingsFieldGroup settingsConfig={settingsConfig} />
));

settingComponentRegistry.set(ZodFirstPartyTypeKind.ZodNumber, (settingsConfig) => {
  return (
    <SettingsFieldWrapper
      settingsConfig={settingsConfig}
      typeName={ZodFirstPartyTypeKind.ZodNumber}
      renderItem={({ fieldKey, fieldValue, handleChange, isInvalid, coercedSchema }: any) => (
        <EuiFieldNumber
          fullWidth
          data-test-subj={fieldKey}
          value={fieldValue}
          onChange={handleChange}
          isInvalid={isInvalid}
          min={coercedSchema.minValue ?? undefined}
          max={coercedSchema.maxValue ?? undefined}
        />
      )}
    />
  );
});

settingComponentRegistry.set(ZodFirstPartyTypeKind.ZodString, (settingsConfig) => {
  return (
    <SettingsFieldWrapper
      settingsConfig={settingsConfig}
      typeName={ZodFirstPartyTypeKind.ZodString}
      renderItem={({ fieldKey, fieldValue, handleChange, isInvalid }: any) => (
        <EuiFieldText
          fullWidth
          data-test-subj={fieldKey}
          value={fieldValue}
          onChange={handleChange}
          isInvalid={isInvalid}
        />
      )}
    />
  );
});

export function ConfiguredSettings({
  configuredSettings,
}: {
  configuredSettings: SettingsConfig[];
}) {
  return (
    <>
      {configuredSettings.map((configuredSetting) => {
        const Component = settingComponentRegistry.get(getInnerType(configuredSetting.schema));

        if (!Component) {
          throw new Error(`Unknown setting type: ${configuredSetting.schema._type}}`);
        }

        return <Component key={configuredSetting.name} {...configuredSetting} />;
      })}
    </>
  );
}
