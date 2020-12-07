/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AccessorConfig } from '../../../types';

export function PaletteIndicator({ accessorConfig }: { accessorConfig: AccessorConfig }) {
  if (accessorConfig.triggerIcon !== 'colorBy' || !accessorConfig.palette) return null;
  return (
    <EuiFlexGroup className="lnsLayerPanel__paletteContainer" gutterSize="none" alignItems="center">
      {accessorConfig.palette.map((color) => (
        <EuiFlexItem
          key={color}
          className="lnsLayerPanel__paletteColor"
          grow={true}
          style={{
            backgroundColor: color,
          }}
        />
      ))}
    </EuiFlexGroup>
  );
}
