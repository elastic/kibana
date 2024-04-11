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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSwitch,
} from '@elastic/eui';

import type { SettingsConfig } from '../../../../../common/settings/types';
import { useAgentPolicyFormContext } from '../../sections/agent_policy/components/agent_policy_form';

export const settingComponentRegistry = new Map<
  string,
  (settingsconfig: SettingsConfig) => React.ReactElement
>();

settingComponentRegistry.set(ZodFirstPartyTypeKind.ZodObject, (settingsConfig) => {
  const agentPolicyFormContext = useAgentPolicyFormContext();

  const shape = settingsConfig.schema._def.innerType._def.shape();
  return (
    <SettingsFieldWrapper
      settingsConfig={settingsConfig}
      typeName={ZodFirstPartyTypeKind.ZodString}
      renderItem={({}: any) => (
        <EuiFlexGroup direction="column">
          {Object.keys(shape).map((key) => {
            const field = shape[key];
            const fieldKey = `configuredSetting-${settingsConfig.name}-${key}`;
            const defaultValue: number =
              field instanceof z.ZodDefault ? field._def.defaultValue() : undefined;
            const coercedSchema = field as z.ZodString;
            const fieldValue =
              agentPolicyFormContext?.agentPolicy.advanced_settings?.[
                settingsConfig.api_field.name
              ]?.[key] ?? defaultValue;
            const type = getInnerType(field);
            const [error, setError] = useState('');

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const newValue = convertValue(e.target.value, type);
              updateFieldValue(newValue);
            };

            const updateFieldValue = (newValue: any) => {
              const validationError = validateSchema(coercedSchema, newValue);

              if (validationError) {
                setError(validationError);
                agentPolicyFormContext?.updateAdvancedSettingsHasErrors(true);
              } else {
                setError('');
                agentPolicyFormContext?.updateAdvancedSettingsHasErrors(false);
              }

              const newApiFieldValue = {
                ...agentPolicyFormContext?.agentPolicy.advanced_settings?.[
                  settingsConfig.api_field.name
                ],
                [key]: newValue,
              };

              const newAdvancedSettings = {
                ...(agentPolicyFormContext?.agentPolicy.advanced_settings ?? {}),
                [settingsConfig.api_field.name]: newApiFieldValue,
              };

              agentPolicyFormContext?.updateAgentPolicy({ advanced_settings: newAdvancedSettings });
            };

            const getFormField = () => {
              switch (type) {
                case ZodFirstPartyTypeKind.ZodNumber:
                  return (
                    <EuiFieldNumber
                      fullWidth
                      data-test-subj={fieldKey}
                      value={fieldValue}
                      onChange={handleChange}
                      isInvalid={!!error}
                      min={(field as z.ZodNumber).minValue ?? undefined}
                      max={(field as z.ZodNumber).maxValue ?? undefined}
                    />
                  );
                case ZodFirstPartyTypeKind.ZodString:
                  return (
                    <EuiFieldText
                      fullWidth
                      data-test-subj={fieldKey}
                      value={fieldValue}
                      onChange={handleChange}
                      isInvalid={!!error}
                    />
                  );
                case ZodFirstPartyTypeKind.ZodBoolean:
                  return (
                    <EuiSwitch
                      label={''}
                      checked={fieldValue}
                      onChange={(e) => {
                        updateFieldValue(e.target.checked);
                      }}
                    />
                  );
                default:
                  return <></>;
              }
            };

            return (
              <EuiFlexItem key={`flexItem-${fieldKey}`}>
                <EuiFormRow fullWidth key={fieldKey} label={key} error={error} isInvalid={!!error}>
                  {getFormField()}
                </EuiFormRow>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    />
  );
});

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

const convertValue = (value: string, type: keyof typeof ZodFirstPartyTypeKind): any => {
  if (type === ZodFirstPartyTypeKind.ZodNumber) {
    if (value === '') {
      return 0;
    }
    return parseInt(value, 10);
  }
  return value;
};

const validateSchema = (coercedSchema: z.ZodString, newValue: any): string | undefined => {
  const validationResults = coercedSchema.safeParse(newValue);

  if (!validationResults.success) {
    return validationResults.error.issues[0].message;
  }
};

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = convertValue(e.target.value, typeName);
    const validationError = validateSchema(coercedSchema, newValue);

    if (validationError) {
      setError(validationError);
      agentPolicyFormContext?.updateAdvancedSettingsHasErrors(true);
    } else {
      setError('');
      agentPolicyFormContext?.updateAdvancedSettingsHasErrors(false);
    }

    const newAdvancedSettings = {
      ...(agentPolicyFormContext?.agentPolicy.advanced_settings ?? {}),
      [settingsConfig.api_field.name]: newValue,
    };

    agentPolicyFormContext?.updateAgentPolicy({ advanced_settings: newAdvancedSettings });
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

const getInnerType = (schema: z.ZodType<any, any>) => {
  return schema instanceof z.ZodDefault
    ? schema._def.innerType._def.typeName === 'ZodEffects'
      ? schema._def.innerType._def.schema._def.typeName
      : schema._def.innerType._def.typeName
    : schema._def.typeName;
};

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
