/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React from 'react';
import { fnOperationTypeMapping } from './constants';

interface FunctionPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const FunctionPicker: FC<FunctionPickerProps> = React.memo(({ value, onChange }) => {
  const options = Object.keys(fnOperationTypeMapping).map((v) => {
    return {
      id: v,
      label: v,
    };
  });

  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.aiops.changePointDetection.selectFunctionLabel', {
        defaultMessage: 'Function',
      })}
      options={options}
      idSelected={value}
      onChange={(id) => onChange(id)}
      isFullWidth
      buttonSize="compressed"
    />
  );
});
