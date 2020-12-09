/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import {
  EuiDescribedFormGroup,
  EuiDescribedFormGroupProps,
  EuiSwitchProps,
  EuiSwitch,
  EuiSpacer,
} from '@elastic/eui';

export interface SwitchProps
  extends Omit<EuiSwitchProps, 'children' | 'checked' | 'value' | 'onChange'> {
  /**
   * use initialValue to specify an uncontrolled component
   */
  initialValue?: boolean;

  /**
   * checked and onChange together specify a controlled component
   */
  checked?: boolean;
  onChange?: (nextValue: boolean) => void;
}

export type Props = EuiDescribedFormGroupProps & {
  children: (() => JSX.Element) | JSX.Element | JSX.Element[] | undefined;

  switchProps?: SwitchProps;

  /**
   * Use this prop to pass down components that should be rendered below the toggle like
   * warnings or notices.
   */
  fieldNotices?: React.ReactNode;
};

export const DescribedFormRow: FunctionComponent<Props> = ({
  children,
  switchProps,
  description,
  fieldNotices,
  ...restDescribedFormProps
}) => {
  if (
    switchProps &&
    !(typeof switchProps.checked === 'boolean' || typeof switchProps.initialValue === 'boolean')
  ) {
    throw new Error('Must specify controlled, uncontrolled component. See SwitchProps interface!');
  }
  const [uncontrolledIsContentVisible, setUncontrolledIsContentVisible] = useState<boolean>(
    () => switchProps?.initialValue ?? false
  );
  const isContentVisible = Boolean(switchProps?.checked ?? uncontrolledIsContentVisible);

  const renderToggle = () => {
    if (!switchProps) {
      return null;
    }
    const { onChange, checked, initialValue, ...restSwitchProps } = switchProps;

    return (
      <EuiSwitch
        {...restSwitchProps}
        checked={isContentVisible}
        onChange={(e) => {
          const nextValue = e.target.checked;
          setUncontrolledIsContentVisible(nextValue);
          if (onChange) {
            onChange(nextValue);
          }
        }}
      />
    );
  };
  return (
    <EuiDescribedFormGroup
      {...restDescribedFormProps}
      description={
        <>
          {description}
          <EuiSpacer size="m" />
          {renderToggle()}
          {fieldNotices}
        </>
      }
    >
      {isContentVisible ? (typeof children === 'function' ? children() : children) : null}
    </EuiDescribedFormGroup>
  );
};
