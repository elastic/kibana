/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormLabel, EuiFormRow, EuiFormRowProps } from '@elastic/eui';
import './form_row.scss';

type FormRowProps = EuiFormRowProps & { isInline?: boolean };

export const FormRow = ({ children, label, isInline, ...props }: FormRowProps) => {
  return !isInline ? (
    <EuiFormRow {...props} label={label}>
      {children}
    </EuiFormRow>
  ) : (
    <div data-test-subj={props['data-test-subj']}>
      {React.cloneElement(children, {
        prepend: (
          <EuiFormLabel className="lnsIndexPatternDimensionEditor__labelCustomRank">
            {label}
          </EuiFormLabel>
        ),
      })}
    </div>
  );
};
