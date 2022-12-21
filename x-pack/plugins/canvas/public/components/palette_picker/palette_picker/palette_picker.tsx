/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { ClearablePalettePicker } from './clearable_palette_picker';
import { palettes as defaultPalettes } from '../../../../common/lib/palettes';
import { PalettePickerProps } from '../types';
import { DefaultPalettePicker } from './default_palette_picker';

export const PalettePicker: FC<PalettePickerProps> = (props) => {
  const { additionalPalettes = [] } = props;
  const palettes = [...defaultPalettes, ...additionalPalettes];

  if (props.clearable) {
    return (
      <ClearablePalettePicker
        palettes={palettes}
        palette={props.palette}
        onChange={props.onChange}
      />
    );
  }

  return (
    <DefaultPalettePicker palettes={palettes} palette={props.palette} onChange={props.onChange} />
  );
};

PalettePicker.propTypes = {
  id: PropTypes.string,
  palette: PropTypes.object,
  onChange: PropTypes.func,
  clearable: PropTypes.bool,
};
