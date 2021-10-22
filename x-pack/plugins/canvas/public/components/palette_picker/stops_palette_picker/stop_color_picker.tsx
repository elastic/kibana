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
import React, { FC, useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { ColorStop } from '../types';

interface Props {
  removable?: boolean;
  stop?: number;
  color?: string;
  onDelete: () => void;
  onChange: (colorStop: ColorStop) => void;
}

export const StopColorPicker: FC<Props> = (props) => {
  const { stop, color, onDelete, onChange, removable = true } = props;

  const [colorStop, setColorStop] = useState<ColorStop>({ stop: stop ?? 0, color: color ?? '' });

  const onChangeInput = (updatedColorStop: ColorStop) => {
    setColorStop(updatedColorStop);
  };

  const [, cancel] = useDebounce(
    () => {
      if (color === colorStop.color && stop === colorStop.stop) return;
      onChange(colorStop);
    },
    200,
    [colorStop]
  );

  useEffect(() => {
    setColorStop({ stop: stop ?? 0, color: color ?? '' });
  }, [color, stop]);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            value={colorStop.stop}
            min={-Infinity}
            onChange={({ target: { valueAsNumber } }) =>
              onChangeInput({ ...colorStop, stop: valueAsNumber })
            }
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiColorPicker
            secondaryInputDisplay="top"
            color={colorStop.color}
            showAlpha
            compressed
            onChange={(newColor) => {
              onChangeInput({ ...colorStop, color: newColor });
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            title={'Delete'}
            onClick={onDelete}
            isDisabled={!removable}
            aria-label="212"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
