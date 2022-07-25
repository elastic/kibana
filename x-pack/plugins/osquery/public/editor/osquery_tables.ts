/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap, sortBy } from 'lodash';

type TablesJSON = Array<{
  name: string;
}>;
export const normalizeTables = (tablesJSON: TablesJSON) => sortBy(tablesJSON, 'name');

let osqueryTables: TablesJSON | null = null;

export const getOsqueryTables = () => {
  if (!osqueryTables) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    osqueryTables = normalizeTables(require('../common/schemas/osquery/v5.2.2.json'));
  }

  return osqueryTables;
};

export const getOsqueryTableNames = () => flatMap(getOsqueryTables(), 'name');
