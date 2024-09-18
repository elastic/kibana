/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormRow, UseField, Field } from '../../../../../shared_imports';
import { getFieldConfig } from '../../../../../lib';

export const PassthroughRequiredParameters = () => {
  const config = getFieldConfig('priority');

  return (
    <FormRow title={<h3>{config.label}</h3>}>
      <UseField path="priority" config={config} component={Field} />
    </FormRow>
  );
};
