/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext, FieldError } from 'react-hook-form';
import { Step } from './step';
import { FORM_CONFIG } from '../form/form_config';
import { Field } from '../form/field';
import { ConfigKey, FormMonitorType, StepKey } from '../types';

export const StepFields = ({
  description,
  stepKey,
}: {
  description: React.ReactNode;
  stepKey: StepKey;
}) => {
  const {
    watch,
    formState: { errors },
  } = useFormContext();
  const [type]: [FormMonitorType] = watch([ConfigKey.FORM_MONITOR_TYPE]);

  return (
    <Step description={description}>
      {FORM_CONFIG[type][stepKey]?.map((field) => {
        return (
          <Field
            {...field}
            key={field.fieldKey}
            fieldError={errors[field.fieldKey] as FieldError}
          />
        );
      })}
    </Step>
  );
};
