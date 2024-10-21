/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { splitSizeAndUnits } from '../../../../../../common';

const convertToMinutes = (value: string) => {
  const { size, unit } = splitSizeAndUnits(value);
  const sizeNum = parseInt(size, 10);

  switch (unit) {
    case 'd':
      // days to minutes
      return sizeNum * 24 * 60;
    case 'h':
      // hours to minutes
      return sizeNum * 60;
    case 'm':
      // minutes to minutes
      return sizeNum;
    case 's':
      // seconds to minutes (round up if any remainder)
      return Math.ceil(sizeNum / 60);
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
};

const isRetentionBiggerThan = (valueA: string, valueB: string) => {
  const minutesA = convertToMinutes(valueA);
  const minutesB = convertToMinutes(valueB);

  return minutesA > minutesB;
};

export const isBiggerThanGlobalMaxRetention = (
  retentionValue,
  retentionTimeUnit,
  globalMaxRetention
) => {
  if (!retentionValue || !retentionTimeUnit || !globalMaxRetention) {
    return undefined;
  }

  return isRetentionBiggerThan(`${retentionValue}${retentionTimeUnit}`, globalMaxRetention)
    ? {
        message: i18n.translate(
          'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldMaxError',
          {
            defaultMessage: 'Maximum data retention period on this project is {maxRetention} days.',
            // Remove the unit from the globalMaxRetention value
            values: { maxRetention: globalMaxRetention.slice(0, -1) },
          }
        ),
      }
    : undefined;
};
