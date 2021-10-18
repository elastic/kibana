/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { PalettePickerProps } from '../types';
import { PalettePicker } from '../palette_picker';

export const StopsPalettePicker: FC<PalettePickerProps> = (props) => {
  return (
    <PalettePicker
      additionalPalettes={[]}
      // palette={props.palette}
      onChange={props.onChange}
      clearable={false}
    />
  );
};
