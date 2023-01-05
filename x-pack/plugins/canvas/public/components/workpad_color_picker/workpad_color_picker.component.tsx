/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { addColor, removeColor } from '../../state/actions/workpad';
import { getWorkpadColors } from '../../state/selectors/workpad';
import { ColorPickerPopover, Props } from '../color_picker_popover';

const strings = {
  getBackgroundColorLabel: () =>
    i18n.translate('xpack.canvas.workpadConfig.backgroundColorLabel', {
      defaultMessage: 'Background color',
    }),
};

export const WorkpadColorPicker = (props: Props) => {
  const dispatch = useDispatch();
  const onAddColor = useCallback((payload) => dispatch(addColor(payload)), [dispatch]);
  const onRemoveColor = useCallback((payload) => dispatch(removeColor(payload)), [dispatch]);
  const colors = useSelector(getWorkpadColors);

  return (
    <ColorPickerPopover
      {...props}
      onAddColor={onAddColor}
      onRemoveColor={onRemoveColor}
      colors={colors}
      hasButtons={true}
      ariaLabel={strings.getBackgroundColorLabel()}
    />
  );
};

WorkpadColorPicker.propTypes = ColorPickerPopover.propTypes;
