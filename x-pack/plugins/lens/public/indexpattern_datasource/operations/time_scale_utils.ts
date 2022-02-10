/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unitSuffixesLong } from '../../../common/suffix_formatter';
import type { TimeScaleUnit } from '../../../common/expressions';
import type { IndexPatternLayer } from '../types';
import type { GenericIndexPatternColumn } from './definitions';

export const DEFAULT_TIME_SCALE = 's' as TimeScaleUnit;

function getSuffix(scale: TimeScaleUnit | undefined, shift: string | undefined) {
  return (
    (shift || scale ? ' ' : '') +
    (scale ? unitSuffixesLong[scale] : '') +
    (shift && scale ? ' ' : '') +
    (shift ? `-${shift}` : '')
  );
}

export function adjustTimeScaleLabelSuffix(
  oldLabel: string,
  previousTimeScale: TimeScaleUnit | undefined,
  newTimeScale: TimeScaleUnit | undefined,
  previousShift: string | undefined,
  newShift: string | undefined
) {
  let cleanedLabel = oldLabel;
  // remove added suffix if column had a time scale previously
  if (previousTimeScale || previousShift) {
    const suffix = getSuffix(previousTimeScale, previousShift);
    const suffixPosition = oldLabel.lastIndexOf(suffix);
    if (suffixPosition !== -1) {
      cleanedLabel = oldLabel.substring(0, suffixPosition);
    }
  }
  if (!newTimeScale && !newShift) {
    return cleanedLabel;
  }
  // add new suffix if column has a time scale now
  return `${cleanedLabel}${getSuffix(newTimeScale, newShift)}`;
}

export function adjustTimeScaleOnOtherColumnChange<T extends GenericIndexPatternColumn>(
  layer: IndexPatternLayer,
  thisColumnId: string,
  changedColumnId: string
): T {
  const columns = layer.columns;
  const column = columns[thisColumnId] as T;
  if (!column.timeScale) {
    return column;
  }
  const hasDateHistogram = Object.values(columns).some(
    (col) => col?.operationType === 'date_histogram'
  );
  if (hasDateHistogram) {
    return column;
  }
  if (column.customLabel) {
    return column;
  }
  return {
    ...column,
    timeScale: undefined,
    label: adjustTimeScaleLabelSuffix(
      column.label,
      column.timeScale,
      undefined,
      column.timeShift,
      column.timeShift
    ),
  };
}
