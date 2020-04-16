/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  FormRow,
  FieldConfig,
  UseField,
  FIELD_TYPES,
  Field,
  ToggleField,
} from '../../../../../../shared_imports';

const ignoreFailureConfig: FieldConfig = {
  defaultValue: false,
  label: 'Ignore Failure',
  type: FIELD_TYPES.TOGGLE,
};
const ifConfig: FieldConfig = {
  defaultValue: undefined,
  label: 'If',
  type: FIELD_TYPES.TEXT,
};
const tagConfig: FieldConfig = {
  defaultValue: undefined,
  label: 'Tag',
  type: FIELD_TYPES.TEXT,
};

export const CommonProcessorFields: FunctionComponent = () => {
  return (
    <>
      <FormRow title="Ignore Failure">
        <UseField config={ignoreFailureConfig} component={ToggleField} path={'ignore_failure'} />
      </FormRow>
      <FormRow title="If">
        <UseField config={ifConfig} component={Field} path={'if'} />
      </FormRow>
      <FormRow title="Tag">
        <UseField config={tagConfig} component={Field} path={'tag'} />
      </FormRow>
    </>
  );
};
