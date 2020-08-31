/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFieldText, EuiFieldNumber, EuiButtonGroup } from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui';

import { CanvasVariable } from '../../../types';

import { ComponentStrings } from '../../../i18n';
const { VarConfigVarValueField: strings } = ComponentStrings;

interface Props {
  type: CanvasVariable['type'];
  value: CanvasVariable['value'];
  onChange: (v: CanvasVariable['value']) => void;
}

export const VarValueField: FC<Props> = ({ type, value, onChange }) => {
  const idPrefix = htmlIdGenerator()();

  const options = [
    {
      id: `${idPrefix}-true`,
      label: strings.getTrueOption(),
    },
    {
      id: `${idPrefix}-false`,
      label: strings.getFalseOption(),
    },
  ];

  if (type === 'number') {
    return (
      <EuiFieldNumber
        compressed
        name="value"
        value={value as number}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (type === 'boolean') {
    return (
      <EuiButtonGroup
        name="value"
        options={options}
        idSelected={`${idPrefix}-${value}`}
        onChange={(id) => {
          const val = id.replace(`${idPrefix}-`, '') === 'true';
          onChange(val);
        }}
        buttonSize="compressed"
        isFullWidth
      />
    );
  }

  return (
    <EuiFieldText
      compressed
      name="value"
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
