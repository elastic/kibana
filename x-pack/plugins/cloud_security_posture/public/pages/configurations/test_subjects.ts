/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FINDINGS_FLYOUT = 'findings_flyout';
export const FINDINGS_TABLE_EXPAND_COLUMN = 'findings_table_expand_column';
export const FINDINGS_TABLE = 'findings_table';
export const FINDINGS_CONTAINER = 'findings_container';
export const FINDINGS_BY_RESOURCE_CONTAINER = 'findings_by_resource_container';
export const FINDINGS_BY_RESOURCE_TABLE_RESOURCE_ID_COLUMN =
  'findings_by_resource_table_resource_id_column';
export const FINDINGS_BY_RESOURCE_TABLE = 'findings_by_resource_table';

export const getFindingsByResourceTableRowTestId = (id: string) =>
  `findings_resource_table_row_${id}`;
export const LATEST_FINDINGS_CONTAINER = 'latest_findings_container';
export const LATEST_FINDINGS_TABLE = 'latest_findings_table';

export const FINDINGS_GROUP_BY_SELECTOR = 'findings_group_by_selector';
export const FINDINGS_GROUPING_COUNTER = 'findings_grouping_counter';

export const getFindingsTableRowTestId = (id: string) => `findings_table_row_${id}`;
export const getFindingsTableCellTestId = (columnId: string, rowId: string) =>
  `findings_table_cell_${columnId}_${rowId}`;

export const FINDINGS_TABLE_CELL_ADD_FILTER = 'findings_table_cell_add_filter';
export const FINDINGS_TABLE_CELL_ADD_NEGATED_FILTER = 'findings_table_cell_add_negated_filter';

export const RESOURCES_FINDINGS_CONTAINER = 'resources_findings_container';
export const RESOURCES_FINDINGS_TABLE = 'resource_findings_table';
export const getResourceFindingsTableRowTestId = (id: string) =>
  `resource_findings_table_row_${id}`;
