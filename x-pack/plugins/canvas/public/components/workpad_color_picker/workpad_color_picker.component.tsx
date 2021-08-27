/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ColorPickerPopover, Props } from '../color_picker_popover';

const strings = {
  getBackgroundColorLabel: () =>
    i18n.translate('xpack.canvas.workpadConfig.backgroundColorLabel', {
      defaultMessage: 'Background color',
    }),
};

export const WorkpadColorPicker = (props: Props) => {
  return (
    <ColorPickerPopover
      {...props}
      hasButtons={true}
      ariaLabel={strings.getBackgroundColorLabel()}
    />
  );
};

WorkpadColorPicker.propTypes = ColorPickerPopover.propTypes;
