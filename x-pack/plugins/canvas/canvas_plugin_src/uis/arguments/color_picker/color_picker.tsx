/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import {
  EuiColorPicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSetColorMethod,
  useColorPickerState,
} from '@elastic/eui';
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { withDebounceArg } from '../../../../public/components/with_debounce_arg';
import { ArgumentStrings } from '../../../../i18n';

const { Color: strings } = ArgumentStrings;

interface Props {
  onValueChange: (value: string) => void;
  argValue: string;
}

const ColorPicker: FC<Props> = ({ onValueChange, argValue }) => {
  const [color, setColor, errors] = useColorPickerState(argValue);

  const pickColor: EuiSetColorMethod = (value, meta) => {
    setColor(value, meta);
    onValueChange(value);
  };

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiColorPicker compressed onChange={pickColor} color={color} isInvalid={!!errors} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ColorPicker.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
};

export const colorPicker = () => ({
  name: 'color_picker',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(withDebounceArg(ColorPicker)),
  default: '"#000"',
});
