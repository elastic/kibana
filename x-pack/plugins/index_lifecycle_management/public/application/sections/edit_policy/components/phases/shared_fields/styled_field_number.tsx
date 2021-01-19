/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiFieldNumber, EuiFieldNumberProps, EuiFormRow, EuiIcon } from '@elastic/eui';
import { getFieldValidityAndErrorMessage, UseField } from '../../../../../../shared_imports';

interface Props {
  path: string;
  fieldNumberProps: { [key: string]: string | number };
}
export const StyledFieldNumber: FunctionComponent<Props> = ({ path, fieldNumberProps }) => {
  return (
    <UseField path={path}>
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        const appendProps = isInvalid
          ? { append: <EuiIcon type={'alert'} color={'danger'} /> }
          : {};
        return (
          <EuiFormRow style={{ maxWidth: 350 }} isInvalid={isInvalid} error={errorMessage}>
            <EuiFieldNumber
              aria-label={field.label}
              prepend={field.label}
              isInvalid={isInvalid}
              value={field.value as EuiFieldNumberProps['value']}
              onChange={field.onChange}
              isLoading={field.isValidating}
              {...fieldNumberProps}
              {...appendProps}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
