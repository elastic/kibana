/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import SemVer from 'semver/classes/semver';

import { getFieldConfig } from '../../../../lib';
import { Field as FieldType, NormalizedField } from '../../../../types';

import {
  BoostParameter,
  DocValuesParameter,
  IndexParameter,
  NullValueParameter,
  StoreParameter,
} from '../../field_parameters';

import { Field, UseField } from '../../../../shared_imports';
import { AdvancedParametersSection, BasicParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'null_value': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
  kibanaVersion: SemVer;
}

export const IpType = ({ field, kibanaVersion }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter hasIndexOptions={false} />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <DocValuesParameter />

        <NullValueParameter defaultToggleValue={getDefaultToggleValue('null_value', field.source)}>
          <UseField path="null_value" config={getFieldConfig('null_value_ip')} component={Field} />
        </NullValueParameter>

        <StoreParameter />

        {/* The "boost" parameter is deprecated since 8.x */}
        {kibanaVersion.major < 8 && (
          <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
        )}
      </AdvancedParametersSection>
    </>
  );
};
