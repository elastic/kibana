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
      label={i18n.translate('xpack.maps.emsVectorTileStyleEditor.colorFilterPickerLabel', {
        defaultMessage: 'Color filter',
      })}
    >
      <EuiColorPicker
        compressed
        aria-label="Color"
        color={color}
        onChange={onChange}
        secondaryInputDisplay="top"
        isClearable
        format="hex"
        placeholder="No filter"
        aria-placeholder="No filter"
      />
    </EuiFormRow>
  );
}
