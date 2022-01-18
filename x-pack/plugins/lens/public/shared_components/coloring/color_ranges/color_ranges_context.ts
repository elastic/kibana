/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { DataBounds } from '../types';

interface ColorRangesContextType {
  dataBounds: DataBounds;
  palettes: PaletteRegistry;
  disableSwitchingContinuity?: boolean;
}

export const ColorRangesContext = React.createContext<ColorRangesContextType>(
  {} as ColorRangesContextType
);
