/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { UseField } from '../../form';

import { DescribedFormRow, DescribedFormRowProps, DescribedFormRowSwitchProps } from './';

type Props = Omit<DescribedFormRowProps, 'switchProps'> & {
  switchProps: Omit<DescribedFormRowSwitchProps, 'label'> & { path: string };
};

export const ToggleFieldWithDescribedFormRow: FunctionComponent<Props> = ({
  switchProps,
  ...passThroughProps
}) => (
  <UseField<boolean> path={switchProps.path}>
    {(field) => {
      return (
        <DescribedFormRow
          {...passThroughProps}
          switchProps={{
            ...switchProps,
            label: field.label,
            checked: field.value,
            onChange: field.setValue,
          }}
        />
      );
    }}
  </UseField>
);
