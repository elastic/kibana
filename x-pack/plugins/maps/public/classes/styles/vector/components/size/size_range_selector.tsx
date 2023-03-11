/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ValidatedDualRange } from '@kbn/kibana-react-plugin/public';
import { EuiDualRangeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MIN_SIZE, MAX_SIZE } from '../../vector_style_defaults';

interface Props extends Omit<EuiDualRangeProps, 'value' | 'onChange' | 'min' | 'max'> {
  minSize: number;
  maxSize: number;
  onChange: ({ maxSize, minSize }: { maxSize: number; minSize: number }) => void;
}

export function SizeRangeSelector({ minSize, maxSize, onChange, ...rest }: Props) {
  const onSizeChange = ([min, max]: [string, string]) => {
    onChange({
      minSize: Math.max(MIN_SIZE, parseInt(min, 10)),
      maxSize: Math.min(MAX_SIZE, parseInt(max, 10)),
    });
  };

  return (
    <ValidatedDualRange
      min={MIN_SIZE}
      max={MAX_SIZE}
      step={1}
      value={[minSize, maxSize]}
      showInput="inputWithPopover"
      showRange
      onChange={onSizeChange}
      allowEmptyRange={false}
      append={i18n.translate('xpack.maps.vector.dualSize.unitLabel', {
        defaultMessage: 'px',
        description: 'Shorthand for pixel',
      })}
      {...rest}
    />
  );
}
