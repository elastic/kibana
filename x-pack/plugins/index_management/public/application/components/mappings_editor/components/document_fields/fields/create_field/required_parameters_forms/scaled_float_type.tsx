/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { PARAMETERS_DEFINITION } from '../../../../../constants';
import { getFieldConfig } from '../../../../../lib';
import { Field, FormRow, UseField } from '../../../../../shared_imports';

export const ScaledFloatTypeRequiredParameters = () => {
  return (
    <FormRow
      title={<h3>{PARAMETERS_DEFINITION.scaling_factor.title}</h3>}
      description={PARAMETERS_DEFINITION.scaling_factor.description}
    >
      <UseField path="scaling_factor" config={getFieldConfig('scaling_factor')} component={Field} />
    </FormRow>
  );
};
