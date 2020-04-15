/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  FormRow,
  FormSchema,
  UseField,
  FIELD_TYPES,
  Field,
  ToggleField,
} from '../../../../shared_imports';

export const formSchema: FormSchema = {
  ignore_failure: {
    defaultValue: false,
    label: 'Ignore Failure',
    type: FIELD_TYPES.TOGGLE,
  },
  if: {
    defaultValue: undefined,
    label: 'If',
    type: FIELD_TYPES.TEXT,
  },
  tag: {
    defaultValue: undefined,
    label: 'Tag',
    type: FIELD_TYPES.TEXT,
  },
};

export const CommonProcessorFields: FunctionComponent = () => {
  return (
    <>
      <FormRow title="Ignore Failure">
        <UseField component={ToggleField} path={'ignore_failure'} />
      </FormRow>
      <FormRow title="If">
        <UseField component={Field} path={'if'} />
      </FormRow>
      <FormRow title="Tag">
        <UseField component={Field} path={'tag'} />
      </FormRow>
    </>
  );
};
