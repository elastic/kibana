/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import {
  buildResultColumns,
  Datatable,
  ExecutionContext,
} from '../../../../../../src/plugins/expressions/common';
import {
  calculateBounds,
  getDateHistogramMetaDataByDatatableColumn,
  parseInterval,
} from '../../../../../../src/plugins/data/common';
import type { TimeScaleExpressionFunction, TimeScaleUnit, TimeScaleArgs } from './types';

const unitInMs: Record<TimeScaleUnit, number> = {
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
};

export const timeScaleFn =
  (
    getTimezone: (context: ExecutionContext) => string | Promise<string>
  ): TimeScaleExpressionFunction['fn'] =>
  async (
    input,
    { dateColumnId, inputColumnId, outputColumnId, outputColumnName, targetUnit }: TimeScaleArgs,
    context
  ) => {
    const dateColumnDefinition = input.columns.find((column) => column.id === dateColumnId);

    if (!dateColumnDefinition) {
      throw new Error(
        i18n.translate('xpack.lens.functions.timeScale.dateColumnMissingMessage', {
          defaultMessage: 'Specified dateColumnId {columnId} does not exist.',
          values: {
            columnId: dateColumnId,
          },
        })
      );
    }

    const resultColumns = buildResultColumns(
      input,
      outputColumnId,
      inputColumnId,
      outputColumnName,
      {
        allowColumnOverwrite: true,
      }
    );

    if (!resultColumns) {
      return input;
    }

    const targetUnitInMs = unitInMs[targetUnit];
    const timeInfo = getDateHistogramMetaDataByDatatableColumn(dateColumnDefinition, {
      timeZone: await getTimezone(context),
    });
    const intervalDuration = timeInfo?.interval && parseInterval(timeInfo.interval);

    if (!timeInfo || !intervalDuration) {
      throw new Error(
        i18n.translate('xpack.lens.functions.timeScale.timeInfoMissingMessage', {
          defaultMessage: 'Could not fetch date histogram information',
        })
      );
    }
    // the datemath plugin always parses dates by using the current default moment time zone.
    // to use the configured time zone, we are switching just for the bounds calculation.

    // The code between this call and the reset in the finally block is not allowed to get async,
    // otherwise the timezone setting can leak out of this function.
    const defaultTimezone = moment().zoneName();
    let result: Datatable;
    try {
      moment.tz.setDefault(timeInfo.timeZone);

      const timeBounds = timeInfo.timeRange && calculateBounds(timeInfo.timeRange);

      result = {
        ...input,
        columns: resultColumns,
        rows: input.rows.map((row) => {
          const newRow = { ...row };

          let startOfBucket = moment(row[dateColumnId]);
          let endOfBucket = startOfBucket.clone().add(intervalDuration);
          if (timeBounds && timeBounds.min) {
            startOfBucket = moment.max(startOfBucket, timeBounds.min);
          }
          if (timeBounds && timeBounds.max) {
            endOfBucket = moment.min(endOfBucket, timeBounds.max);
          }
          const bucketSize = endOfBucket.diff(startOfBucket);
          const factor = bucketSize / targetUnitInMs;

          const currentValue = newRow[inputColumnId];
          if (currentValue != null) {
            newRow[outputColumnId] = Number(currentValue) / factor;
          }

          return newRow;
        }),
      };
    } finally {
      // reset default moment timezone
      moment.tz.setDefault(defaultTimezone);
    }

    return result;
  };
