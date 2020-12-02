/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'src/plugins/ui_actions/public';
import { RawValue } from '../../common/constants';
import { DatatableColumnType } from '../../../../../src/plugins/expressions';

export function isUrlDrilldown(action: Action) {
  // @ts-expect-error
  return action.type === 'URL_DRILLDOWN';
}

// VALUE_CLICK_TRIGGER is coupled with expressions and Datatable type
// URL drilldown parses event scope from Datatable
// https://github.com/elastic/kibana/blob/7.10/x-pack/plugins/drilldowns/url_drilldown/public/lib/url_drilldown_scope.ts#L140
// In order to use URL drilldown, maps has to package its data in Datatable compatiable format.
export function toValueClickDataFormat(key: string, value: RawValue) {
  return [
    {
      table: {
        columns: [
          {
            id: key,
            meta: {
              type: 'unknown' as DatatableColumnType, // type is not used by URL drilldown to parse event but is required by DatatableColumnMeta
              field: key,
            },
            name: key,
          },
        ],
        rows: [
          {
            [key]: value,
          },
        ],
      },
      column: 0,
      row: 0,
      value,
    },
  ];
}
