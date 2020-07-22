/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { cloneElement, Children, Fragment, ReactElement } from 'react';
import { EuiFormRow, EuiFormRowProps } from '@elastic/eui';

type Props = EuiFormRowProps & {
  errorKey: string;
  isShowingErrors: boolean;
  errors: Record<string, string[]>;
};

export const ErrableFormRow: React.FunctionComponent<Props> = ({
  errorKey,
  isShowingErrors,
  errors,
  children,
  ...rest
}) => {
  return (
    <EuiFormRow
      isInvalid={isShowingErrors && errors[errorKey].length > 0}
      error={errors[errorKey]}
      {...rest}
    >
      <Fragment>
        {Children.map(children, (child) =>
          cloneElement(child as ReactElement, {
            isInvalid: isShowingErrors && errors[errorKey].length > 0,
          })
        )}
      </Fragment>
    </EuiFormRow>
  );
};
