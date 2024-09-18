/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { PathParameter } from '../../field_parameters';
import { NormalizedField, NormalizedFields } from '../../../../types';
import { UseField, Field } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { BasicParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
}

export const PassthroughType = ({ field, allFields }: Props) => {
  return (
    <BasicParametersSection>
      <PathParameter field={field} allFields={allFields} />

      <UseField path="priority" config={getFieldConfig('priority')} component={Field} />
    </BasicParametersSection>
  );
};
