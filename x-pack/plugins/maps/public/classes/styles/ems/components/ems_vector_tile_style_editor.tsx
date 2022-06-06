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
  onEMSVectorTileColorChange: ({ color }: { color: string }) => void;
}

export function EMSVectorTileStyleEditor({ color, onEMSVectorTileColorChange }: Props) {
  const onColorChange = (color: string) => {
    onEMSVectorTileColorChange({
      color: color,
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
        onChange={onColorChange}
        secondaryInputDisplay="top"
        isClearable
        format="hex"
        placeholder="No filter"
        aria-placeholder="No filter"
      />
    </EuiFormRow>
  );
}
