/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { BasicParametersSection } from '../edit_field';
import { UseField, Field } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';

export const DenseVectorType = () => {
  return (
    <BasicParametersSection>
      <UseField path="dims" config={getFieldConfig('dims')} component={Field} />
    </BasicParametersSection>
  );
};
