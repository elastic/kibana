/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiDescribedFormGroup, EuiDescribedFormGroupProps } from '@elastic/eui';

import { ToggleableField, Props as ToggleableFieldProps } from './toggleable_field';

type Props = EuiDescribedFormGroupProps & {
  switchProps: ToggleableFieldProps;
};

export const DescribedFormField: FunctionComponent<Props> = ({
  children,
  switchProps,
  ...restDescribedFormProps
}) => {
  return (
    <EuiDescribedFormGroup {...restDescribedFormProps}>
      <ToggleableField {...switchProps}>{children}</ToggleableField>
    </EuiDescribedFormGroup>
  );
};
