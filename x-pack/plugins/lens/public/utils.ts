/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IndexPattern, IndexPatternsContract, TimefilterContract } from 'src/plugins/data/public';
import { LensFilterEvent } from './types';

/** replaces the value `(empty) to empty string for proper filtering` */
export const desanitizeFilterContext = (
  context: LensFilterEvent['data']
): LensFilterEvent['data'] => {
  const emptyTextValue = i18n.translate('xpack.lens.indexpattern.emptyTextColumnValue', {
    defaultMessage: '(empty)',
  });
  const result: LensFilterEvent['data'] = {
    ...context,
    data: context.data.map((point) =>
      point.value === emptyTextValue
        ? {
            ...point,
            value: '',
            table: {
              ...point.table,
              rows: point.table.rows.map((row, index) =>
                index === point.row
                  ? {
                      ...row,
                      [point.table.columns[point.column].id]: '',
                    }
                  : row
              ),
            },
          }
        : point
    ),
  };
  if (context.timeFieldName) {
    result.timeFieldName = context.timeFieldName;
  }
  return result;
};

export function getVisualizeGeoFieldMessage(fieldType: string) {
  return i18n.translate('xpack.lens.visualizeGeoFieldMessage', {
    defaultMessage: `Lens cannot visualize {fieldType} fields`,
    values: { fieldType },
  });
}

export const getResolvedDateRange = function (timefilter: TimefilterContract) {
  const { from, to } = timefilter.getTime();
  const { min, max } = timefilter.calculateBounds({
    from,
    to,
  });
  return { fromDate: min?.toISOString() || from, toDate: max?.toISOString() || to };
};

export function containsDynamicMath(dateMathString: string) {
  return dateMathString.includes('now');
}
export const TIME_LAG_PERCENTAGE_LIMIT = 0.02;

export async function getAllIndexPatterns(
  ids: string[],
  indexPatternsService: IndexPatternsContract
): Promise<{ indexPatterns: IndexPattern[]; rejectedIds: string[] }> {
  const responses = await Promise.allSettled(ids.map((id) => indexPatternsService.get(id)));
  const fullfilled = responses.filter(
    (response): response is PromiseFulfilledResult<IndexPattern> => response.status === 'fulfilled'
  );
  const rejectedIds = responses
    .map((_response, i) => ids[i])
    .filter((id, i) => responses[i].status === 'rejected');
  // return also the rejected ids in case we want to show something later on
  return { indexPatterns: fullfilled.map((response) => response.value), rejectedIds };
}
