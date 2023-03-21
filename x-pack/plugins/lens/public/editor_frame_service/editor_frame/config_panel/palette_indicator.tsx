/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiColorPaletteDisplay } from '@elastic/eui';
import { AccessorConfig } from '../../../types';

export function PaletteIndicator({ accessorConfig }: { accessorConfig: AccessorConfig }) {
  if (accessorConfig.triggerIconType !== 'colorBy' || !accessorConfig.palette) return null;
  return (
    <div className="lnsLayerPanel__paletteContainer">
      <EuiColorPaletteDisplay
        className="lnsLayerPanel__palette"
        size="xs"
        palette={accessorConfig.palette}
      />
    </div>
  );
}
