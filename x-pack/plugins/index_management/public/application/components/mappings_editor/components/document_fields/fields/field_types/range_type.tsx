/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import {
  StoreParameter,
  IndexParameter,
  BoostParameter,
  CoerceNumberParameter,
  FormatParameter,
  LocaleParameter,
} from '../../field_parameters';
import { BasicParametersSection, AdvancedParametersSection } from '../edit_field';
import { FormDataProvider } from '../../../../shared_imports';

const getDefaultToggleValue = (param: 'locale' | 'format' | 'boost', field: FieldType) => {
  return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
};

interface Props {
  field: NormalizedField;
}

export const RangeType = ({ field }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter hasIndexOptions={false} />

        <FormDataProvider pathsToWatch="subType">
          {formData =>
            formData.subType === 'date_range' ? (
              <FormatParameter
                defaultValue={field.source.format as string}
                defaultToggleValue={getDefaultToggleValue('format', field.source)}
              />
            ) : null
          }
        </FormDataProvider>
      </BasicParametersSection>

      <AdvancedParametersSection>
        <FormDataProvider pathsToWatch="subType">
          {formData =>
            formData.subType === 'date_range' ? (
              <LocaleParameter defaultToggleValue={getDefaultToggleValue('locale', field.source)} />
            ) : null
          }
        </FormDataProvider>

        <CoerceNumberParameter />

        <StoreParameter />

        <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
      </AdvancedParametersSection>
    </>
  );
};
