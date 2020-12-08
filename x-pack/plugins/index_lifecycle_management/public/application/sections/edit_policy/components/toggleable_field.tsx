/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiSpacer, EuiSwitch, EuiSwitchProps } from '@elastic/eui';

export interface Props extends Omit<EuiSwitchProps, 'checked' | 'onChange'> {
  children: (() => JSX.Element) | JSX.Element | JSX.Element[] | undefined;
  checked?: boolean;
  initialValue?: boolean;
  onChange?: (nextValue: boolean) => void;
}

export const ToggleableField: FunctionComponent<Props> = ({
  initialValue,
  checked,
  onChange,
  children,
  ...restProps
}) => {
  const [uncontrolledIsContentVisible, setUncontrolledIsContentVisible] = useState<boolean>(
    initialValue ?? false
  );

  const isContentVisible = Boolean(checked ?? uncontrolledIsContentVisible);

  return (
    <>
      <EuiSwitch
        {...restProps}
        checked={isContentVisible}
        onChange={(e) => {
          const nextValue = e.target.checked;
          setUncontrolledIsContentVisible(nextValue);
          if (onChange) {
            onChange(nextValue);
          }
        }}
      />
      <EuiSpacer size="m" />
      {isContentVisible ? (typeof children === 'function' ? children() : children) : null}
    </>
  );
};
