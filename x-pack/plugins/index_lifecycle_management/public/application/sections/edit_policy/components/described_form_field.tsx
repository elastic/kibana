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
  hideSwitch?: boolean;
};

export const DescribedFormField: FunctionComponent<Props> = ({
  children,
  switchProps,
  hideSwitch = false,
  ...restDescribedFormProps
}) => {
  return (
    <EuiDescribedFormGroup {...restDescribedFormProps}>
      {!hideSwitch ? (
        <ToggleableField {...switchProps}>{children}</ToggleableField>
      ) : (
        <>{children}</>
      )}
    </EuiDescribedFormGroup>
  );
};
