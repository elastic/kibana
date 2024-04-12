/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, ZodFirstPartyTypeKind } from 'zod';
import React, { useState } from 'react';
import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

import type { SettingsConfig } from '../../../../../common/settings/types';
import { useAgentPolicyFormContext } from '../../sections/agent_policy/components/agent_policy_form';

import {
  convertValue,
  getInnerType,
  SettingsFieldWrapper,
  validateSchema,
} from './settings_field_wrapper';

export const SettingsFieldGroup: React.FC<{ settingsConfig: SettingsConfig }> = ({
  settingsConfig,
}) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
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

            const description = field._def.description ?? key;

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const newValue = convertValue(e.target.value, type);
              updateFieldValue(newValue);
            };

            const updateFieldValue = (newValue: any) => {
              const validationError = validateSchema(coercedSchema, newValue);

              if (validationError) {
                setErrors({ ...errors, key: validationError });
                agentPolicyFormContext?.updateAdvancedSettingsHasErrors(true);
              } else {
                setErrors({ ...errors, key: '' });
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
                      isInvalid={!!errors[key]}
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
                      isInvalid={!!errors[key]}
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
                <EuiFormRow
                  fullWidth
                  key={fieldKey}
                  label={description}
                  error={errors[key]}
                  isInvalid={!!errors[key]}
                >
                  {getFormField()}
                </EuiFormRow>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    />
  );
};
