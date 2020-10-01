/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedField, Field as FieldType, ParameterName } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { IgnoreMalformedParameter, MetaParameter } from '../../field_parameters';
import { AdvancedParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultToggleValue = (param: ParameterName, field: FieldType) => {
  return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
};

export const HistogramType = ({ field }: Props) => {
  return (
    <AdvancedParametersSection>
      <IgnoreMalformedParameter />

      <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />
    </AdvancedParametersSection>
  );
};
