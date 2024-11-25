/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { splitSizeAndUnits } from '../../../../../../common';
import { deserializeGlobalMaxRetention } from '../../../../lib/data_streams';

const convertToSeconds = (value: string) => {
  const { size, unit } = splitSizeAndUnits(value);
  const sizeNum = parseInt(size, 10);

  switch (unit) {
    case 'd':
      // days to seconds
      return sizeNum * 24 * 60 * 60;
    case 'h':
      // hours to seconds
      return sizeNum * 60 * 60;
    case 'm':
      // minutes to seconds
      return sizeNum * 60;
    case 's':
      // seconds to seconds
      return sizeNum;
    case 'ms':
      // milliseconds to seconds
      return sizeNum / 1000;
    case 'micros':
      // microseconds to seconds
      return sizeNum / 1000 / 1000;
    case 'nanos':
      // nanoseconds to seconds
      return sizeNum / 1000 / 1000 / 1000;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
};

const isRetentionBiggerThan = (valueA: string, valueB: string) => {
  const secondsA = convertToSeconds(valueA);
  const secondsB = convertToSeconds(valueB);

  return secondsA > secondsB;
};

export const isBiggerThanGlobalMaxRetention = (
  retentionValue: string | number,
  retentionTimeUnit: string,
  globalMaxRetention: string
) => {
  if (!retentionValue || !retentionTimeUnit || !globalMaxRetention) {
    return undefined;
  }

  const { size, unitText } = deserializeGlobalMaxRetention(globalMaxRetention);
  return isRetentionBiggerThan(`${retentionValue}${retentionTimeUnit}`, globalMaxRetention)
    ? {
        message: i18n.translate(
          'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldMaxError',
          {
            defaultMessage:
              'Maximum data retention period on this project is {maxRetention} {unitText}.',
            // Remove the unit from the globalMaxRetention value
            values: {
              maxRetention: size,
              unitText,
            },
          }
        ),
      }
    : undefined;
};
