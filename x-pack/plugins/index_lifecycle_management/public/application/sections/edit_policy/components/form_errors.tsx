/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { cloneElement, Children, Fragment, ReactElement } from 'react';
import { EuiFormRow, EuiFormRowProps } from '@elastic/eui';

type Props = EuiFormRowProps & {
  isShowingErrors: boolean;
  errors?: string | string[] | null;
};

export const ErrableFormRow: React.FunctionComponent<Props> = ({
  isShowingErrors,
  errors,
  children,
  ...rest
}) => {
  const _errors = errors ? (Array.isArray(errors) ? errors : [errors]) : undefined;
  return (
    <EuiFormRow
      isInvalid={isShowingErrors || (_errors && _errors.length > 0)}
      error={errors}
      {...rest}
    >
      <Fragment>
        {Children.map(children, (child) =>
          cloneElement(child as ReactElement, {
            isInvalid: errors && isShowingErrors && errors.length > 0,
          })
        )}
      </Fragment>
    </EuiFormRow>
  );
};
