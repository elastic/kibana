/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { MbValidatedColorPicker } from './mb_validated_color_picker';

export function StaticColorForm({
  onStaticStyleChange,
  staticDynamicSelect,
  styleProperty,
  swatches,
}) {
  const onColorChange = (color) => {
    onStaticStyleChange(styleProperty.getStyleName(), { color });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect}
      </EuiFlexItem>
      <EuiFlexItem>
        <MbValidatedColorPicker
          onChange={onColorChange}
          color={styleProperty.getOptions().color}
          swatches={swatches}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
