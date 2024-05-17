/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import SemVer from 'semver/classes/semver';

import { getFieldConfig } from '../../../../lib';
import { FormDataProvider } from '../../../../shared_imports';
import {
  ComboBoxOption,
  Field as FieldType,
  NormalizedField,
  ParameterName,
} from '../../../../types';
import {
  BoostParameter,
  CoerceNumberParameter,
  FormatParameter,
  IndexParameter,
  LocaleParameter,
  MetaParameter,
  StoreParameter,
} from '../../field_parameters';
import { AdvancedParametersSection, BasicParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: ParameterName, field: FieldType) => {
  return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
};

interface Props {
  field: NormalizedField;
  kibanaVersion: SemVer;
}

export const RangeType = ({ field, kibanaVersion }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter hasIndexOptions={false} />

        <FormDataProvider<{ subType?: ComboBoxOption[] }> pathsToWatch="subType">
          {(formData) =>
            formData.subType?.[0]?.value === 'date_range' ? (
              <FormatParameter
                defaultValue={field.source.format as string}
                defaultToggleValue={getDefaultToggleValue('format', field.source)}
              />
            ) : null
          }
        </FormDataProvider>
      </BasicParametersSection>

      <AdvancedParametersSection>
        <FormDataProvider<{ subType?: ComboBoxOption[] }> pathsToWatch="subType">
          {(formData) =>
            formData.subType?.[0]?.value === 'date_range' ? (
              <LocaleParameter defaultToggleValue={getDefaultToggleValue('locale', field.source)} />
            ) : null
          }
        </FormDataProvider>

        <CoerceNumberParameter />

        <StoreParameter />

        <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />

        {/* The "boost" parameter is deprecated since 8.x */}
        {kibanaVersion.major < 8 && (
          <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
        )}
      </AdvancedParametersSection>
    </>
  );
};
