/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConfigKey, Validation, CommonFields as CommonFieldsType } from '../types';
import { CommonFields } from '../common/common_fields';
import { Enabled } from '../common/enabled';

interface Props {
  validate: Validation;
  onInputChange: ({ value, configKey }: { value: unknown; configKey: ConfigKey }) => void;
  children: React.ReactNode;
  fields: CommonFieldsType;
}

export const SimpleFieldsWrapper = ({ validate, onInputChange, children, fields }: Props) => {
  return (
    <>
      <Enabled fields={fields} onChange={onInputChange} />
      {children}
      <CommonFields fields={fields} onChange={onInputChange} validate={validate} />
    </>
  );
};
