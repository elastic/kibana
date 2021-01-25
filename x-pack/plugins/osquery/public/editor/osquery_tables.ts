/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatMap, sortBy } from 'lodash';
import osqueryTablesJSON from './osquery_schema/v4.6.0.json';

export const normalizeTables = (tablesJSON) => {
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
