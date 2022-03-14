/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiText } from '@elastic/eui';
import type { EuiFormRowProps } from '@elastic/eui';
import { useFormikContext } from 'formik';
import type { FunctionComponent } from 'react';
import React, { Children } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { FormLabel } from './form_label';

/**
 * Same as @see EuiFormRow but automatically renders `error` and `isInvalid` states based on @see FormikContext.
 */
export const FormRow: FunctionComponent<EuiFormRowProps & { name?: string }> = (props) => {
  const formik = useFormikContext();
  const child = Children.only(props.children);
  const meta = formik.getFieldMeta(props.name ?? child.props.name);

  const isOptional = !child.props.validate || !child.props.validate.required;
  const isDisabled = props.isDisabled || child.props.disabled;

  return (
    <EuiFormRow
      error={meta.error}
      isInvalid={meta.touched && !!meta.error}
      {...props}
      label={
        props.label ? (
          <FormLabel isEqual={meta.value === meta.initialValue}>{props.label}</FormLabel>
        ) : undefined
      }
      labelAppend={
        !props.labelAppend && isOptional && !isDisabled ? <OptionalText /> : props.labelAppend
      }
    >
      {child}
    </EuiFormRow>
  );
};

export const OptionalText: FunctionComponent = () => {
  return (
    <EuiText size="xs" color="subdued">
      <FormattedMessage
        id="xpack.security.accountManagement.userProfile.newPasswordLabel"
        defaultMessage="Optional"
      />
    </EuiText>
  );
};
