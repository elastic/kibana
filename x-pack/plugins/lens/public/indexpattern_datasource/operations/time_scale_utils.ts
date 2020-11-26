/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unitSuffixesLong } from '../suffix_formatter';
import { TimeScaleUnit } from '../time_scale';

export const DEFAULT_TIME_SCALE = 's' as TimeScaleUnit;

export function adjustTimeScaleLabelSuffix(
  oldLabel: string,
  previousTimeScale: TimeScaleUnit | undefined,
  newTimeScale: TimeScaleUnit | undefined
) {
  let cleanedLabel = oldLabel;
  // remove added suffix if column had a time scale previously
  if (previousTimeScale) {
    const suffixPosition = oldLabel.lastIndexOf(` ${unitSuffixesLong[previousTimeScale]}`);
    if (suffixPosition !== -1) {
      cleanedLabel = oldLabel.substring(0, suffixPosition);
    }
  }
  if (!newTimeScale) {
    return cleanedLabel;
  }
  // add new suffix if column has a time scale now
  return `${cleanedLabel} ${unitSuffixesLong[newTimeScale]}`;
}
