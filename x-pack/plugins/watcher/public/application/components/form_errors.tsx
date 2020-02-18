/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { Children, cloneElement, Fragment, ReactElement } from 'react';
export const ErrableFormRow = ({
  errorKey,
  isShowingErrors,
  errors,
  children,
  ...rest
}: {
  errorKey: string;
  isShowingErrors: boolean;
  errors: { [key: string]: string[] };
  children: ReactElement;
  [key: string]: any;
}) => {
  return (
    <EuiFormRow
      isInvalid={isShowingErrors && errors[errorKey].length > 0}
      error={errors[errorKey]}
      {...rest}
    >
      <Fragment>{Children.map(children, child => cloneElement(child))}</Fragment>
    </EuiFormRow>
  );
};
