/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore currently no definition for EuiFieldPassword
import { EuiFieldPassword, EuiFormRow } from '@elastic/eui';
import { withFormsy } from 'formsy-react';
import React, { Component, InputHTMLAttributes } from 'react';

class FieldPassword extends Component<InputHTMLAttributes<HTMLInputElement>> {
  public render() {
    return (
      <EuiFormRow>
        <EuiFieldPassword />
      </EuiFormRow>
    );
  }
}

export const FormsyEuiPasswordText = withFormsy(FieldPassword);
