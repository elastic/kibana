/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StaticValueConfig, XYVisualOptions } from '@kbn/lens-embeddable-utils';
import type { AllowedSettingsOverrides, AllowedXYOverrides } from '@kbn/lens-plugin/common/types';

interface XYOverrides {
  axisLeft: AllowedXYOverrides['axisLeft'];
  settings: AllowedSettingsOverrides['settings'];
}

export const REFERENCE_LINE: StaticValueConfig = {
  value: '1',
  format: {
    id: 'percent',
    params: {
      decimals: 0,
    },
  },
  color: '#6092c0',
};

export const XY_OVERRIDES: XYOverrides = {
  axisLeft: {
    domain: {
      min: 0,
      max: 1,
    },
  },
  settings: {
    showLegend: true,
    legendPosition: 'bottom',
    legendSize: 35,
  },
};

export const XY_MISSING_VALUE_DOTTED_LINE_CONFIG: XYVisualOptions = {
  showDottedLine: true,
  missingValues: 'Linear',
};

export const KPI_CHART_HEIGHT = 150;
