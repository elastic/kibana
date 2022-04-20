/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FINDINGS_SEARCH_BAR = 'findings_search_bar';
export const FINDINGS_TABLE = 'findings_table';
export const FINDINGS_CONTAINER = 'findings_container';
export const FINDINGS_TABLE_ZERO_STATE = 'findings_table_zero_state';
export const getFindingsByResourceTableRowTestId = (id: string) =>
  `findings_resource_table_row_${id}`;
