/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap, sortBy } from 'lodash';
import osqueryTablesJSON from './osquery_schema/v4.6.0.json';

type TablesJSON =
  | string
  | Array<{
      name: string;
      description: string;
      url: string;
      platforms: string[];
      evented: boolean;
      cacheable: boolean;
      columns: Array<{
        name: string;
        description: string;
        type: string;
        hidden: boolean;
        required: boolean;
        index: boolean;
      }>;
    }>;
export const normalizeTables = (tablesJSON: TablesJSON) => {
  // osquery JSON needs less parsing than it used to
  const parsedTables = typeof tablesJSON === 'object' ? tablesJSON : JSON.parse(tablesJSON);
  return sortBy(parsedTables, (table) => {
    return table.name;
  });
};

export const osqueryTables = normalizeTables(osqueryTablesJSON);
export const osqueryTableNames = flatMap(osqueryTables, (table) => {
  return table.name;
});
