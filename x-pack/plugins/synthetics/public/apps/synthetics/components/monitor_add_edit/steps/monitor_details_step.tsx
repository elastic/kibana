/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { Controller, ControllerRenderProps, FieldValues, useFormContext } from 'react-hook-form';
import { Step } from './step';
import { FIELD_CONFIG } from '../form/config';

export const MonitorDetailsStep = () => {
  const { register } = useFormContext();
  const type = 'http';
  return (
    <Step description="Provide some details about how your monitor should run.">
      <EuiFlexGroup>
        <EuiFlexItem>
          {FIELD_CONFIG[type].step2.map((field) => {
            const Component = field.component;
            const registerProps = register(field.key);
            return (
              <EuiFormRow label={field.label} helpText={field.helpText}>
                <Component {...registerProps} {...(field.props || {})} />
              </EuiFormRow>
            );
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    </Step>
  );
};
