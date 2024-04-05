/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, ZodFirstPartyTypeKind } from 'zod';
import React, { useState } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';

import type { SettingsConfig } from '../../../../../common/settings/types';
import { useAgentPolicyFormContext } from '../../sections/agent_policy/components/agent_policy_form';

export const settingComponentRegistry = new Map<
  string,
  (settingsconfig: SettingsConfig) => React.ReactElement
>();

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

const SettingsFieldWrapper: React.FC<{
  settingsConfig: SettingsConfig;
  typeName: keyof typeof ZodFirstPartyTypeKind;
  renderItem: Function;
}> = ({ settingsConfig, typeName, renderItem }) => {
  const [error, setError] = useState('');
  const agentPolicyFormContext = useAgentPolicyFormContext();

  const fieldKey = `configuredSetting-${settingsConfig.name}`;
  const defaultValue: number =
    settingsConfig.schema instanceof z.ZodDefault
      ? settingsConfig.schema._def.defaultValue()
      : undefined;
  const coercedSchema = settingsConfig.schema as z.ZodString;

  const convertValue = (value: string, type: keyof typeof ZodFirstPartyTypeKind): any => {
    if (type === ZodFirstPartyTypeKind.ZodNumber) {
      if (value === '') {
        return 0;
      }
      return parseInt(value, 10);
    }
    return value;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = convertValue(e.target.value, typeName);
    const validationResults = coercedSchema.safeParse(newValue);

    if (!validationResults.success) {
      setError(validationResults.error.issues[0].message);
      return;
    }

    const newAdvancedSettings = {
      ...(agentPolicyFormContext?.agentPolicy.advanced_settings ?? {}),
      [settingsConfig.api_field.name]: newValue,
    };

    agentPolicyFormContext?.updateAgentPolicy({ advanced_settings: newAdvancedSettings });

    setError('');
  };

  const fieldValue =
    agentPolicyFormContext?.agentPolicy.advanced_settings?.[settingsConfig.api_field.name] ??
    defaultValue;

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h4>{settingsConfig.title}</h4>}
      description={
        <>
          {settingsConfig.description}.{' '}
          <EuiLink href={settingsConfig.learnMoreLink} external>
            Learn more.
          </EuiLink>
        </>
      }
    >
      <EuiFormRow fullWidth key={fieldKey} error={error} isInvalid={!!error}>
        {renderItem({ fieldValue, handleChange, isInvalid: !!error, fieldKey, coercedSchema })}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};

export function ConfiguredSettings({
  configuredSettings,
}: {
  configuredSettings: SettingsConfig[];
}) {
  return (
    <>
      {configuredSettings.map((configuredSetting) => {
        const Component = settingComponentRegistry.get(
          configuredSetting.schema instanceof z.ZodDefault
            ? configuredSetting.schema._def.innerType._def.typeName
            : configuredSetting.schema._def.typeName
        );

        if (!Component) {
          throw new Error(`Unknown setting type: ${configuredSetting.schema._type}}`);
        }

        return <Component key={configuredSetting.name} {...configuredSetting} />;
      })}
    </>
  );
}
