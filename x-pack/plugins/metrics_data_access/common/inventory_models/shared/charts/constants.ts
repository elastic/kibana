/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensXYConfigBase } from '@kbn/lens-embeddable-utils/config_builder';

export const DEFAULT_XY_FITTING_FUNCTION: Pick<LensXYConfigBase, 'fittingFunction'> = {
  fittingFunction: 'Linear',
};

export const DEFAULT_XY_HIDDEN_LEGEND: Pick<LensXYConfigBase, 'legend'> = {
  legend: {
    show: false,
  },
};

export const DEFAULT_XY_LEGEND: Pick<LensXYConfigBase, 'legend'> = {
  legend: {
    position: 'bottom',
    show: true,
  },
};

export const DEFAULT_XY_YBOUNDS: Pick<LensXYConfigBase, 'yBounds'> = {
  yBounds: {
    mode: 'custom',
    lowerBound: 0,
    upperBound: 1,
  },
};

export const DEFAULT_XY_HIDDEN_AXIS_TITLE: Pick<LensXYConfigBase, 'axisTitleVisibility'> = {
  axisTitleVisibility: {
    showXAxisTitle: false,
    showYAxisTitle: false,
  },
};
