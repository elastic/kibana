/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
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

settingComponentRegistry.set(z.number()._def.typeName, (settingsConfig) => {
  const [error, setError] = useState('');

  const agentPolicyFormContext = useAgentPolicyFormContext();
  const fieldKey = `configuredSetting-${settingsConfig.name}`;

  const defaultValue: number =
    settingsConfig.schema instanceof z.ZodDefault
      ? settingsConfig.schema._def.defaultValue()
      : undefined;
  const coercedSchema = settingsConfig.schema as z.ZodNumber;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validationResults = coercedSchema.safeParse(Number(e.target.value));

    if (!validationResults.success) {
      setError(validationResults.error.issues[0].message);
      return;
    }

    agentPolicyFormContext?.updateAgentPolicy({ [settingsConfig.api_field.name]: e.target.value });
    setError('');
  };

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
        <EuiFieldNumber
          fullWidth
          data-test-subj={fieldKey}
          value={agentPolicyFormContext?.agentPolicy[settingsConfig.api_field.name]}
          min={coercedSchema.minValue ?? undefined}
          max={coercedSchema.maxValue ?? undefined}
          defaultValue={defaultValue}
          onChange={handleChange}
          isInvalid={!!error}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

settingComponentRegistry.set(z.string()._def.typeName, (settingsConfig) => {
  const [error, setError] = useState('');
  const agentPolicyFormContext = useAgentPolicyFormContext();

  const fieldKey = `configuredSetting-${settingsConfig.name}`;
  const defaultValue: number =
    settingsConfig.schema instanceof z.ZodDefault
      ? settingsConfig.schema._def.defaultValue()
      : undefined;
  const coercedSchema = settingsConfig.schema as z.ZodString;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validationResults = coercedSchema.safeParse(e.target.value);

    if (!validationResults.success) {
      setError(validationResults.error.issues[0].message);
      return;
    }

    agentPolicyFormContext?.updateAgentPolicy({ [settingsConfig.api_field.name]: e.target.value });
    setError('');
  };

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
        <EuiFieldText
          fullWidth
          data-test-subj={fieldKey}
          value={agentPolicyFormContext?.agentPolicy[settingsConfig.api_field.name]}
          defaultValue={defaultValue}
          onChange={handleChange}
          isInvalid={!!error}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
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
