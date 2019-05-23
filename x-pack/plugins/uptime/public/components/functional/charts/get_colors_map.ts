/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataSeriesColorsValues } from '@elastic/charts';
import { SpecId } from '@elastic/charts/dist/lib/utils/ids';

export const getColorsMap = (
  color: string,
  specId: SpecId
): Map<DataSeriesColorsValues, string> => {
  const map = new Map<DataSeriesColorsValues, string>();
  map.set({ colorValues: [], specId }, color);
  return map;
};
