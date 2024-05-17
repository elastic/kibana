/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { getFieldConfig } from '../../../../lib';
import { Field, UseField } from '../../../../shared_imports';
import { BasicParametersSection } from '../edit_field';

export const DenseVectorType = () => {
  return (
    <BasicParametersSection>
      <UseField path="dims" config={getFieldConfig('dims')} component={Field} />
    </BasicParametersSection>
  );
};
