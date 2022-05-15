/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Step } from './step';
import { FIELD_CONFIG, StepKey } from '../form/config';
import { Field } from '../form/field';
import { ConfigKey, DataStream } from '../types';

export const StepFields = ({ description, stepKey }: { description: string; stepKey: StepKey }) => {
  const {
    watch,
    formState: { errors },
  } = useFormContext();
  const [type]: [DataStream] = watch([ConfigKey.MONITOR_TYPE]);

  return (
    <Step description={description}>
      {FIELD_CONFIG[type][stepKey]?.map((field) => {
        return <Field {...field} key={field.fieldKey} fieldError={errors[field.fieldKey]} />;
      })}
    </Step>
  );
};
