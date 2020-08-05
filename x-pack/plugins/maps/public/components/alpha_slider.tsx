/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { ValidatedRange } from './validated_range';

interface Props {
  alpha: number;
  onChange: (alpha: number) => void;
}

export function AlphaSlider({ alpha, onChange }: Props) {
  const onAlphaChange = (newAlpha: number) => {
    onChange(newAlpha / 100);
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerTransparencyLabel', {
        defaultMessage: 'Opacity',
      })}
      display="columnCompressed"
    >
      <ValidatedRange
        min={0}
        max={100}
        step={1}
        value={Math.round(alpha * 100)}
        onChange={onAlphaChange}
        showInput
        showRange
        compressed
        append={i18n.translate('xpack.maps.layerPanel.settingsPanel.percentageLabel', {
          defaultMessage: '%',
          description: 'Percentage',
        })}
      />
    </EuiFormRow>
  );
}
