/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiColorPicker,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { FC, useState } from 'react';
import { ColorStop } from '../types';

interface Props {
  id: string;
  stop?: number;
  color?: string;
  onDelete: () => void;
  onChange: (colorStop: ColorStop) => void;
}

export const StopColorPicker: FC<Props> = (props) => {
  const { id, stop, color, onDelete, onChange } = props;

  const [colorStop, setColorStop] = useState<ColorStop>({ stop: stop ?? 0, color: color ?? '' });
  const onChangeInput = (updatedColorStop: ColorStop) => {
    setColorStop(updatedColorStop);
  };
  const onBlur = () => onChange(colorStop);

  return (
    <EuiFlexItem key={id}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            value={colorStop.stop}
            min={-Infinity}
            onChange={({ target: { valueAsNumber } }) =>
              onChangeInput({ ...colorStop, stop: valueAsNumber })
            }
            onBlur={onBlur}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiColorPicker
            key={id}
            secondaryInputDisplay="top"
            color={colorStop.color}
            showAlpha
            compressed
            onChange={(newColor) => onChangeInput({ ...colorStop, color: newColor })}
            onBlur={onBlur}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            title={'Delete'}
            onClick={onDelete}
            aria-label="212"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
