/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField, UseFieldProps } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

const HiddenFieldComponent = <T,>(props: UseFieldProps<T>) => {
  return (
    <UseField<T> {...props}>
      {(field) => {
        /**
         * This is a hidden field. We return null so we do not render
         * any field on the form
         */
        return null;
      }}
    </UseField>
  );
};

export const HiddenField = memo(HiddenFieldComponent);
