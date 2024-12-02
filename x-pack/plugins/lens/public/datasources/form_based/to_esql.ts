/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { getUserTimeZone } from '@kbn/data-plugin/common';
import { ValueFormatConfig } from './operations/definitions/column_types';
import { convertToAbsoluteDateRange } from '../../utils';
import type { DateRange } from '../../../common/types';
import { GenericIndexPatternColumn } from './form_based';
import { operationDefinitionMap } from './operations';
import { DateHistogramIndexPatternColumn } from './operations/definitions';
import type { IndexPattern } from '../../types';
import { resolveTimeShift } from './time_shift_utils';
import { FormBasedLayer } from '../..';

export type OriginalColumn = { id: string } & GenericIndexPatternColumn;

// esAggs column ID manipulation functions
export const extractAggId = (id: string) => id.split('.')[0].split('-')[2];
// Need a more complex logic for decimals percentiles

export function getESQLForLayer(
  esAggEntries: Array<readonly [string, GenericIndexPatternColumn]>,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  uiSettings: IUiSettingsClient,
  dateRange: DateRange,
  nowInstant: Date
) {
  // esql mode variables
  const partialRows = true;

  const timeZone = getUserTimeZone((key) => uiSettings.get(key), true);
  if (timeZone !== 'UTC') return;
  if (Object.values(layer.columns).find((col) => col.operationType === 'formula')) return;

  let esql = `FROM ${indexPattern.title} | `;
  if (indexPattern.timeFieldName) {
    esql += `WHERE ${indexPattern.timeFieldName} >= ?_tstart AND ${indexPattern.timeFieldName} <= ?_tend | `;
  }

  const histogramBarsTarget = uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
  const absDateRange = convertToAbsoluteDateRange(dateRange, nowInstant);

  const firstDateHistogramColumn = esAggEntries.find(
    ([, col]) => col.operationType === 'date_histogram'
  );
  const hasDateHistogram = Boolean(firstDateHistogramColumn);

  const esAggsIdMap: Record<string, OriginalColumn[]> = {};

  const metrics = esAggEntries
    .filter(([id, col]) => !col.isBucketed)
    .map(([colId, col], index) => {
      const def = operationDefinitionMap[col.operationType];
      const aggId = String(index);
      const wrapInFilter = Boolean(def.filterable && col.filter?.query);
      const wrapInTimeFilter =
        def.canReduceTimeRange &&
        !hasDateHistogram &&
        col.reducedTimeRange &&
        indexPattern.timeFieldName;

      const esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
        ? `bucket_${index + (col.isBucketed ? 0 : 1)}_${aggId}`
        : `bucket_${index}_${aggId}`;

      const format =
        operationDefinitionMap[col.operationType].getSerializedFormat?.(col, col, indexPattern) ??
        ('sourceField' in col ? indexPattern.getFormatterForField(col.sourceField) : undefined);

      esAggsIdMap[esAggsId] = [
        {
          ...col,
          id: colId,
          params: { format: format as unknown as ValueFormatConfig },
          label: col.customLabel
            ? col.label
            : operationDefinitionMap[col.operationType].getDefaultLabel(
                col,
                layer.columns,
                indexPattern,
                uiSettings,
                dateRange
              ),
        },
      ];

      if (!def.toESQL) return undefined;

      let metricESQL =
        `${esAggsId} = ` +
        def.toESQL!(
          {
            ...col,
            timeShift: resolveTimeShift(
              col.timeShift,
              absDateRange,
              histogramBarsTarget,
              hasDateHistogram
            ),
          },
          wrapInFilter || wrapInTimeFilter ? `${aggId}-metric` : aggId,
          indexPattern,
          layer,
          uiSettings,
          dateRange
        );

      if (wrapInFilter || wrapInTimeFilter) {
        const conditions: string[] = [];
        if (wrapInFilter) {
          if (col.filter?.language === 'kquery') {
            return;
          }
          return; // conditions.push(`QSTR("${col.filter?.query}")`);
        }
        if (wrapInTimeFilter) {
          return undefined;
        }
        if (conditions.length) {
          metricESQL += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      return metricESQL;
    });

  if (metrics.some((m) => !m)) return;
  esql += 'STATS ' + metrics.join(', ');

  const buckets = esAggEntries
    .filter(([id, col]) => col.isBucketed)
    .map(([colId, col], index) => {
      const def = operationDefinitionMap[col.operationType];
      const aggId = String(index);
      const wrapInFilter = Boolean(def.filterable && col.filter?.query);
      const wrapInTimeFilter =
        def.canReduceTimeRange &&
        !hasDateHistogram &&
        col.reducedTimeRange &&
        indexPattern.timeFieldName;

      let esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
        ? `col_${index + (col.isBucketed ? 0 : 1)}-${aggId}`
        : `col_${index}_${aggId}`;

      if (col.operationType === 'date_histogram') {
        esAggsId = (col as DateHistogramIndexPatternColumn).sourceField;
      }

      if (!def.toESQL) return undefined;

      const format =
        operationDefinitionMap[col.operationType].getSerializedFormat?.(col, col, indexPattern) ??
        ('sourceField' in col ? indexPattern.getFormatterForField(col.sourceField) : undefined);

      esAggsIdMap[esAggsId] = [
        {
          ...col,
          id: colId,
          params: { format: format as unknown as ValueFormatConfig },
          label: col.customLabel
            ? col.label
            : operationDefinitionMap[col.operationType].getDefaultLabel(
                col,
                layer.columns,
                indexPattern,
                uiSettings,
                dateRange
              ),
        },
      ];

      if (col.operationType === 'date_histogram') {
        const column = col as DateHistogramIndexPatternColumn;
        if (
          column.params?.dropPartials &&
          // set to false when detached from time picker
          (indexPattern.timeFieldName === indexPattern.getFieldByName(column.sourceField)?.name ||
            !column.params?.ignoreTimeRange)
        ) {
          return undefined;
        }
      }

      return (
        `${esAggsId} = ` +
        def.toESQL!(
          {
            ...col,
            timeShift: resolveTimeShift(
              col.timeShift,
              absDateRange,
              histogramBarsTarget,
              hasDateHistogram
            ),
          },
          wrapInFilter || wrapInTimeFilter ? `${aggId}-metric` : aggId,
          indexPattern,
          layer,
          uiSettings,
          dateRange
        )
      );
    });

  if (buckets.some((m) => !m)) return;

  if (buckets.length > 0) {
    esql += ` BY ${buckets.join(', ')}`;

    if (buckets.some((b) => !b || b.includes('undefined'))) return;

    const sorts = esAggEntries
      .filter(([id, col]) => col.isBucketed)
      .map(([colId, col], index) => {
        const aggId = String(index);
        let esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
          ? `col_${index + (col.isBucketed ? 0 : 1)}-${aggId}`
          : `col_${index}_${aggId}`;

        if (col.operationType === 'date_histogram') {
          esAggsId = (col as DateHistogramIndexPatternColumn).sourceField;
        }

        return `${esAggsId} ASC`;
      });

    esql += ` | SORT ${sorts.join(', ')}`;
  }

  return {
    esql,
    partialRows,
    esAggsIdMap,
  };
}
