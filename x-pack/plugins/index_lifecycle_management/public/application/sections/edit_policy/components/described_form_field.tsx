/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import React, { FunctionComponent, useState } from 'react';
import {
  EuiDescribedFormGroup,
  EuiDescribedFormGroupProps,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchProps,
} from '@elastic/eui';

import { UseField, ToggleField, useFormData } from '../../../../shared_imports';

interface SwitchProps extends Omit<EuiSwitchProps, 'checked' | 'onChange'> {
  initialValue?: boolean;
  path?: string;
  keepChildrenMounted?: boolean;
  onChange?: (nextValue: boolean) => void;
}

type Props = EuiDescribedFormGroupProps & {
  switchProps: SwitchProps;
  keepChildrenMounted?: boolean;
};

export const DescribedFormField: FunctionComponent<Props> = ({
  children,
  switchProps,
  keepChildrenMounted = false,
  ...restDescribedFormProps
}) => {
  const { initialValue, value, path, ...restSwitchProps } = switchProps;
  const [uncontrolledValue, setUncontrolledValue] = useState<boolean>(
    () => switchProps.initialValue ?? false
  );
  const [formData] = useFormData();
  const controlledValue = path ? get(formData, path) : undefined;

  const isContentVisible = Boolean(controlledValue ?? uncontrolledValue);

  const renderChildren = () => {
    if (keepChildrenMounted) {
      return <div style={{ display: isContentVisible ? 'block' : 'none' }}>{children}</div>;
    }
    return isContentVisible ? children : null;
  };

  const renderToggle = () =>
    path ? (
      <UseField
        path={path}
        component={ToggleField}
        componentProps={{
          euiFieldProps: {
            ...restSwitchProps,
          },
        }}
      />
    ) : (
      <EuiSwitch
        {...restSwitchProps}
        checked={isContentVisible}
        onChange={(e) => {
          const nextValue = e.target.checked;
          if (typeof controlledValue !== 'boolean') {
            setUncontrolledValue(nextValue);
          }
          if (switchProps.onChange) {
            switchProps.onChange(nextValue);
          }
        }}
      />
    );

  return (
    <EuiDescribedFormGroup
      {...restDescribedFormProps}
      description={
        <>
          {restDescribedFormProps.description}
          <EuiSpacer />
          {renderToggle()}
        </>
      }
    >
      {renderChildren()}
    </EuiDescribedFormGroup>
  );
};
