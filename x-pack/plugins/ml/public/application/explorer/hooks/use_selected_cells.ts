/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppStateSelectedCells } from '../explorer_utils';

export interface SelectionTimeRange {
  earliestMs: number;
  latestMs: number;
}

export function getTimeBoundsFromSelection(
  selectedCells: AppStateSelectedCells | undefined
): SelectionTimeRange | undefined {
  if (selectedCells?.times === undefined) {
    return;
  }

  // time property of the cell data is an array, with the elements being
  // the start times of the first and last cell selected.
  return {
    earliestMs: selectedCells.times[0] * 1000,
    // Subtract 1 ms so search does not include start of next bucket.
    latestMs: selectedCells.times[1] * 1000 - 1,
  };
}
