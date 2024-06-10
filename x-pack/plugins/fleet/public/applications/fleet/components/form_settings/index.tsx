/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ZodFirstPartyTypeKind } from 'zod';
import React from 'react';
import { EuiFieldNumber, EuiFieldText, EuiSelect } from '@elastic/eui';

import type { SettingsConfig } from '../../../../../common/settings/types';

import { SettingsFieldGroup } from './settings_field_group';
import { getInnerType, SettingsFieldWrapper } from './settings_field_wrapper';

export const settingComponentRegistry = new Map<
  string,
  (settingsconfig: SettingsConfig & { disabled?: boolean }) => React.ReactElement
>();

settingComponentRegistry.set(ZodFirstPartyTypeKind.ZodObject, ({ disabled, ...settingsConfig }) => (
  <SettingsFieldGroup settingsConfig={settingsConfig} disabled={disabled} />
));

settingComponentRegistry.set(ZodFirstPartyTypeKind.ZodNumber, ({ disabled, ...settingsConfig }) => {
  return (
    <SettingsFieldWrapper
      settingsConfig={settingsConfig}
      typeName={ZodFirstPartyTypeKind.ZodNumber}
      renderItem={({ fieldKey, fieldValue, handleChange, isInvalid, coercedSchema }: any) => (
        <EuiFieldNumber
          fullWidth
          disabled={disabled}
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

settingComponentRegistry.set(ZodFirstPartyTypeKind.ZodString, ({ disabled, ...settingsConfig }) => {
  return (
    <SettingsFieldWrapper
      settingsConfig={settingsConfig}
      typeName={ZodFirstPartyTypeKind.ZodString}
      renderItem={({ fieldKey, fieldValue, handleChange, isInvalid }: any) => (
        <EuiFieldText
          fullWidth
          disabled={disabled}
          data-test-subj={fieldKey}
          value={fieldValue}
          onChange={handleChange}
          isInvalid={isInvalid}
        />
      )}
    />
  );
});

settingComponentRegistry.set(
  ZodFirstPartyTypeKind.ZodNativeEnum,
  ({ disabled, ...settingsConfig }) => {
    return (
      <SettingsFieldWrapper
        disabled={disabled}
        settingsConfig={settingsConfig}
        typeName={ZodFirstPartyTypeKind.ZodString}
        renderItem={({ fieldKey, fieldValue, handleChange }: any) => (
          <EuiSelect
            data-test-subj={fieldKey}
            value={fieldValue}
            fullWidth
            disabled={disabled}
            onChange={handleChange}
            options={Object.entries(settingsConfig.schema._def.innerType._def.values).map(
              ([key, value]) => ({
                text: key,
                value: value as string,
              })
            )}
          />
        )}
      />
    );
  }
);

export function ConfiguredSettings({
  configuredSettings,
  disabled,
}: {
  configuredSettings: SettingsConfig[];
  disabled?: boolean;
}) {
  return (
    <>
      {configuredSettings
        .filter((configuredSetting) => !configuredSetting.hidden)
        .map((configuredSetting) => {
          const Component = settingComponentRegistry.get(getInnerType(configuredSetting.schema));

          if (!Component) {
            throw new Error(`Unknown setting type: ${configuredSetting.schema._type}}`);
          }

          return (
            <Component key={configuredSetting.name} {...configuredSetting} disabled={disabled} />
          );
        })}
    </>
  );
}
