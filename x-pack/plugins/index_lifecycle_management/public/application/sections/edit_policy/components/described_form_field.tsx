/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import {
  EuiDescribedFormGroup,
  EuiDescribedFormGroupProps,
  EuiSwitch,
  EuiSwitchProps,
  EuiSpacer,
} from '@elastic/eui';

type SwitchProps = Omit<EuiSwitchProps, 'onChange' | 'checked' | 'value'> & {
  onChange: (nextValue: boolean) => void;
  value?: boolean;
  initialValue?: boolean;
};

type Props = EuiDescribedFormGroupProps & {
  switchProps: SwitchProps;
};

export const DescribedFormField: FunctionComponent<Props> = ({
  children,
  switchProps,
  ...restDescribedFormProps
}) => {
  const { value, initialValue, onChange, ...restSwitchProps } = switchProps;

  if (value === undefined && initialValue === undefined) {
    throw new Error(
      'checked and initialValue are "undefined". You must provide one to indicate whether the switch is controlled.'
    );
  }

  const [isContentVisible, setIsContentVisible] = useState<boolean>(() =>
    Boolean(value ?? initialValue)
  );

  useEffect(() => {
    if (value !== undefined) {
      setIsContentVisible(value);
    }
  }, [value]);

  return (
    <EuiDescribedFormGroup {...restDescribedFormProps}>
      <>
        <EuiSwitch
          {...restSwitchProps}
          checked={isContentVisible}
          onChange={(e) => {
            const nextValue = e.target.checked;
            if (value === undefined) {
              setIsContentVisible(nextValue);
            }
            onChange(nextValue);
          }}
        />
        <EuiSpacer size="m" />
        {isContentVisible ? children : null}
      </>
    </EuiDescribedFormGroup>
  );
};
