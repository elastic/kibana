/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedField, ParameterName, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { StoreParameter, DocValuesParameter, MetaParameter } from '../../field_parameters';
import { AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: ParameterName, field: FieldType) => {
  return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
};

interface Props {
  field: NormalizedField;
}

export const BinaryType = ({ field }: Props) => {
  return (
    <AdvancedParametersSection>
      <DocValuesParameter configPath="doc_values_binary" />
      <StoreParameter />
      <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />
    </AdvancedParametersSection>
  );
};
