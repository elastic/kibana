/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { map, zipObject } from 'lodash';

export const datatable = () => ({
  name: 'datatable',
  validate: datatable => {
    // TODO: Check columns types. Only string, boolean, number, date, allowed for now.
    if (!datatable.columns) {
      throw new Error(
        i18n.translate('xpack.canvas.datatable.missedColumnsErrorMessage', {
          defaultMessage: 'datatable must have a columns array, even if it is empty',
        })
      );
    }

    if (!datatable.rows) {
      throw new Error(
        i18n.translate('xpack.canvas.datatable.missedRowsErrorMessage', {
          defaultMessage: 'datatable must have a rows array, even if it is empty',
        })
      );
    }
  },
  serialize: datatable => {
    const { columns, rows } = datatable;
    return {
      ...datatable,
      rows: rows.map(row => {
        return columns.map(column => row[column.name]);
      }),
    };
  },
  deserialize: datatable => {
    const { columns, rows } = datatable;
    return {
      ...datatable,
      rows: rows.map(row => {
        return zipObject(map(columns, 'name'), row);
      }),
    };
  },
  from: {
    null: () => {
      return {
        type: 'datatable',
        rows: [],
        columns: [],
      };
    },
    pointseries: context => {
      return {
        type: 'datatable',
        rows: context.rows,
        columns: map(context.columns, (val, name) => {
          return { name: name, type: val.type, role: val.role };
        }),
      };
    },
  },
  to: {
    render: datatable => {
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable,
          paginate: true,
          perPage: 10,
          showHeader: true,
        },
      };
    },
  },
});
