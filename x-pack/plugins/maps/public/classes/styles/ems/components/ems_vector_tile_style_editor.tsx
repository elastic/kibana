/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFormRow, EuiColorPicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  color: string;
  onColorChange: ({ color }: { color: string }) => void;
}

export function EMSVectorTileStyleEditor({ color, onColorChange }: Props) {
  const onChange = (selectedColor: string) => {
    onColorChange({
      color: selectedColor,
    });
  };
  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.maps.emsVectorTileStyleEditor.colorBlendPickerLabel', {
        defaultMessage: 'Color blend',
      })}
    >
      <EuiColorPicker
        compressed
        aria-label="Color blend"
        color={color}
        onChange={onChange}
        secondaryInputDisplay="top"
        isClearable
        format="hex"
        placeholder="No color"
        aria-placeholder="No color"
      />
    </EuiFormRow>
  );
}
