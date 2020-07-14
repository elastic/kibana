/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LensFilterEvent } from './types';

/** replaces the value `(empty) to empty string for proper filtering` */
export const desanitizeFilterContext = (
  context: LensFilterEvent['data']
): LensFilterEvent['data'] => {
  const emptyTextValue = i18n.translate('xpack.lens.indexpattern.emptyTextColumnValue', {
    defaultMessage: '(empty)',
  });
  return {
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
};
