/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CommonFields } from './common_fields';
import { Enabled } from './enabled';
import { CommonFields as CommonFieldsType, ConfigKey, Validation } from '../types';

interface Props {
  validate: Validation;
  onInputChange: ({ value, configKey }: { value: unknown; configKey: ConfigKey }) => void;
  onFieldBlur?: (field: ConfigKey) => void;
  children: React.ReactNode;
  fields: CommonFieldsType;
}

export const SimpleFieldsWrapper = ({
  validate,
  onInputChange,
  onFieldBlur,
  children,
  fields,
}: Props) => {
  return (
    <>
      <Enabled
        fields={fields}
        onChange={onInputChange}
        onBlur={() => onFieldBlur?.(ConfigKey.ENABLED)}
      />
      {children}
      <CommonFields
        fields={fields}
        validate={validate}
        onChange={onInputChange}
        onFieldBlur={onFieldBlur}
      />
    </>
  );
};
