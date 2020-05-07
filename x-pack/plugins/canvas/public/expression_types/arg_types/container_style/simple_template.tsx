/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { ColorPickerPopover } from '../../../components/color_picker_popover';
import { CanvasWorkpad } from '../.../../../../../types';
import { ArgTypesStrings } from '../../../../i18n';

const { ContainerStyle: strings } = ArgTypesStrings;

export interface Arguments {
  backgroundColor: string;
}
export type Argument = keyof Arguments;

interface Props {
  getArgValue: <T extends Argument>(key: T) => Arguments[T];
  setArgValue: <T extends Argument>(key: T, val: Arguments[T]) => void;
  workpad: CanvasWorkpad;
}

export const SimpleTemplate: FunctionComponent<Props> = ({ getArgValue, setArgValue, workpad }) => (
  <div style={{ fontSize: 0 }}>
    <ColorPickerPopover
      value={getArgValue('backgroundColor')}
      onChange={color => setArgValue('backgroundColor', color)}
      colors={workpad.colors}
      anchorPosition="leftCenter"
      ariaLabel={strings.getDisplayName()}
    />
  </div>
);

SimpleTemplate.displayName = 'ContainerStyleArgSimpleInput';

SimpleTemplate.propTypes = {
  getArgValue: PropTypes.func.isRequired,
  setArgValue: PropTypes.func.isRequired,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }),
};
