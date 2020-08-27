/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiDescribedFormGroup,
  EuiDescribedFormGroupProps,
  EuiSwitch,
  EuiSwitchProps,
} from '@elastic/eui';

type Props = EuiDescribedFormGroupProps & {
  switchProps: EuiSwitchProps;
};

export const DescribedFormGroup: FunctionComponent<Props> = ({
  children,
  switchProps: { onChange, ...restSwitchProps },
  description,
  ...restDescribedFormProps
}) => {
  return (
    <EuiDescribedFormGroup
      {...restDescribedFormProps}
      description={
        <>
          <p>{description}</p>
          <EuiSwitch
            {...restSwitchProps}
            onChange={(e) => {
              onChange(e.target.checked);
            }}
          />
        </>
      }
    >
      {restSwitchProps.checked ? children : null}
    </EuiDescribedFormGroup>
  );
};
