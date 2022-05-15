/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { UseFormReturn, ControllerRenderProps, useFormContext } from 'react-hook-form';

interface Props {
  component: React.ComponentType<any>;
  props?: any;
  fieldKey: string;
  useSetValue?: boolean;
  field: ControllerRenderProps;
  isInvalid: boolean;
}

const setFieldValue = (key: string, setValue: UseFormReturn['setValue']) => (value: any) => {
  setValue(key, value);
};

export const ControlledField = ({
  component: Component,
  props,
  fieldKey,
  useSetValue,
  field,
  isInvalid,
}: Props) => {
  const { setValue, reset } = useFormContext();
  const onChange = useSetValue ? setFieldValue(fieldKey, setValue) : field.onChange;
  const generatedProps = props ? props({ value: field.value, setValue, reset }) : {};
  return (
    <Component
      {...field}
      checked={field.value}
      defaultValue={field.value}
      onChange={onChange}
      {...generatedProps}
      isInvalid={isInvalid}
      fullWidth
    />
  );
};
