/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';

import { useFormChangesContext } from './form_changes';

export interface FormLabelProps {
  isEqual: boolean;
}

/**
 * Renders a form label that indicates if a field value has changed.
 *
 * @example
 * ```typescript
 * <FormLabel isEqual={formik.values.color === formik.initialValues.color}>
 *   Color
 * </FormLabel>
 * ```
 */
export const FormLabel: FunctionComponent<FormLabelProps> = ({ isEqual, children }) => {
  const { register } = useFormChangesContext();

  useEffect(() => register(isEqual), [isEqual]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs">
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      {!isEqual ? (
        <EuiFlexItem grow={false}>
          <EuiIcon type="dot" color="success" />
        </EuiFlexItem>
      ) : undefined}
    </EuiFlexGroup>
  );
};
