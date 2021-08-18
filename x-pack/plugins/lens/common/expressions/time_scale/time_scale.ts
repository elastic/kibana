/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import type {
  ExpressionFunctionDefinition,
  Datatable,
} from '../../../../../../src/plugins/expressions/common';
import {
  getDateHistogramMetaDataByDatatableColumn,
  parseInterval,
  calculateBounds,
} from '../../../../../../src/plugins/data/common';
import {
  buildResultColumns,
  ExecutionContext,
} from '../../../../../../src/plugins/expressions/common';
import type { TimeScaleUnit } from './types';

export interface TimeScaleArgs {
  dateColumnId: string;
  inputColumnId: string;
  outputColumnId: string;
  targetUnit: TimeScaleUnit;
  outputColumnName?: string;
}

const unitInMs: Record<TimeScaleUnit, number> = {
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
};

export const getTimeScale = (
  getTimezone: (context: ExecutionContext) => string | Promise<string>
): ExpressionFunctionDefinition<
  'lens_time_scale',
  Datatable,
  TimeScaleArgs,
  Promise<Datatable>
> => ({
  name: 'lens_time_scale',
  type: 'datatable',
  help: '',
  args: {
    dateColumnId: {
      types: ['string'],
      help: '',
      required: true,
    },
    inputColumnId: {
      types: ['string'],
      help: '',
      required: true,
    },
    outputColumnId: {
      types: ['string'],
      help: '',
      required: true,
    },
    outputColumnName: {
      types: ['string'],
      help: '',
    },
    targetUnit: {
      types: ['string'],
      options: ['s', 'm', 'h', 'd'],
      help: '',
      required: true,
    },
  },
  inputTypes: ['datatable'],
  async fn(
    input,
    { dateColumnId, inputColumnId, outputColumnId, outputColumnName, targetUnit }: TimeScaleArgs,
    context
  ) {
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
      { allowColumnOverwrite: true }
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
    const defaultTimezone = moment().zoneName();
    moment.tz.setDefault(timeInfo.timeZone);

    const timeBounds = timeInfo.timeRange && calculateBounds(timeInfo.timeRange);

    const result = {
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
    // reset default moment timezone
    moment.tz.setDefault(defaultTimezone);

    return result;
  },
});
