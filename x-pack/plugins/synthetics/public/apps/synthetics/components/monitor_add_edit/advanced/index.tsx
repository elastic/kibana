/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiAccordion,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { Controller, ControllerRenderProps, FieldValues, useFormContext } from 'react-hook-form';
import { FIELD_CONFIG } from '../form/config';

export const AdvancedConfig = () => {
  const { register, control, setValue } = useFormContext();
  const type = 'http';
  return FIELD_CONFIG[type].advanced ? (
    <EuiPanel hasBorder>
      <EuiAccordion id="syntheticsAdvancedPanel" buttonContent="Advanced options">
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            {FIELD_CONFIG[type].advanced?.map((configGroup) => {
              return (
                <EuiDescribedFormGroup
                  description={configGroup.description}
                  title={<h4>{configGroup.title}</h4>}
                  fullWidth
                >
                  {configGroup.components.map(
                    ({ component: Component, helpText, label, props, key, controlled }) =>
                      controlled ? (
                        <EuiFormRow label={label} helpText={helpText} fullWidth>
                          <Controller
                            control={control}
                            name={key}
                            render={({ field }) => {
                              return (
                                <Component
                                  {...field}
                                  checked={field.value}
                                  defaultValue={field.value}
                                  selectedOptions={field.value}
                                  {...(props || {})}
                                  fullWidth
                                />
                              );
                            }}
                          />
                        </EuiFormRow>
                      ) : (
                        <EuiFormRow label={label} helpText={helpText} fullWidth>
                          <Component {...register(key)} {...(props || {})} fullWidth />
                        </EuiFormRow>
                      )
                  )}
                </EuiDescribedFormGroup>
              );
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  ) : null;
};
