/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';

interface FunctionPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const FunctionPicker: FC<FunctionPickerProps> = React.memo(({ value, onChange }) => {
  return (
    <EuiFormRow>
      <EuiSelect
        options={[
          {
            value: 'min',
            text: 'min',
          },
          {
            value: 'max',
            text: 'max',
          },
          {
            value: 'sum',
            text: 'sum',
          },
          {
            value: 'avg',
            text: 'avg',
          },
        ]}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        prepend={i18n.translate('xpack.aiops.changePointDetection.selectFunctionLabel', {
          defaultMessage: 'Function',
        })}
      />
    </EuiFormRow>
  );
});
