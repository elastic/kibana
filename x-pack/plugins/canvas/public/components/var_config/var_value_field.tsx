/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { EuiFieldText, EuiFieldNumber, EuiButtonGroup } from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CanvasVariable } from '../../../types';

const strings = {
  getBooleanOptionsLegend: () =>
    i18n.translate('xpack.canvas.varConfigVarValueField.booleanOptionsLegend', {
      defaultMessage: 'Boolean value',
    }),
  getFalseOption: () =>
    i18n.translate('xpack.canvas.varConfigVarValueField.falseOption', {
      defaultMessage: 'False',
    }),
  getTrueOption: () =>
    i18n.translate('xpack.canvas.varConfigVarValueField.trueOption', {
      defaultMessage: 'True',
    }),
};

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

  const onNumberChange = useCallback(
    (e) => {
      const floatVal = parseFloat(e.target.value);
      const varValue = isNaN(floatVal) ? '' : floatVal;
      onChange(varValue);
    },
    [onChange]
  );

  if (type === 'number') {
    return (
      <EuiFieldNumber compressed name="value" value={value as number} onChange={onNumberChange} />
    );
  }

  if (type === 'boolean') {
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
        legend={strings.getBooleanOptionsLegend()}
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
