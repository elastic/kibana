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

export interface FormRowProps {
  /**
   * Optional name of form field.
   *
   * If not provided the name will be inferred from its child element.
   */
  name?: string;
}

/**
 * Component that renders a form row with all error states for inline validation.
 *
 * @example
 * ```typescript
 * <Formik>
 *   <FormRow label="Email">
 *     <FormField name="email" />
 *   </FormRow>
 * </Formik>
 * ```
 *
 * @throws Error if not a child of a `<Formik>` component.
 * @throws Error if `name` prop is not set and can't be inferred from its child element.
 */
export const FormRow: FunctionComponent<EuiFormRowProps & FormRowProps> = (props) => {
  const formik = useFormikContext();
  const child = Children.only(props.children);
  const name = props.name ?? child.props.name;

  if (!name) {
    throw new Error(
      'name prop is undefined, please verify you are either rendering <FormRow> itself or its child with a name prop.'
    );
  }

  const meta = formik.getFieldMeta(name);

  return (
    <EuiFormRow error={meta.error} isInvalid={meta.touched && !!meta.error} {...props}>
      {child}
    </EuiFormRow>
  );
};

export const OptionalText: FunctionComponent = () => {
  return (
    <EuiText size="xs" color="subdued">
      <FormattedMessage id="xpack.security.formRow.optionalText" defaultMessage="Optional" />
    </EuiText>
  );
};
