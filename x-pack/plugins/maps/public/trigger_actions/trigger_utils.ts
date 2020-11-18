/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'src/plugins/ui_actions/public';

export function isUrlDrilldown(action: Action) {
  return action.type === 'URL_DRILLDOWN';
}

// VALUE_CLICK_TRIGGER is coupled with expressions and Datatable type
// URL drilldown parses event scope from Datatable
// https://github.com/elastic/kibana/blob/master/x-pack/plugins/drilldowns/url_drilldown/public/lib/url_drilldown_scope.ts#L151
// In order to use URL drilldown, maps has to package its data in Datatable compatiable format.
export function toUrlDrilldownDatatable(key: string, value: RawValue) {
  return [
    {
      table: {
        columns: [
          {
            id: key,
            meta: {
              field: key,
            },
            name: key,
          },
        ],
        rows: [
          {
            column0: value,
          },
        ],
      },
      column: 0,
      row: 0,
      value,
    },
  ];
}
