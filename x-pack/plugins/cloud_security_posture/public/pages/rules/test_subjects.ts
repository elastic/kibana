/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CSP_RULES_CONTAINER = 'csp_rules_container';
export const CSP_RULES_TABLE_ITEM_SWITCH = 'csp_rules_table_item_switch';
export const CSP_RULES_SAVE_BUTTON = 'csp_rules_table_save_button';
export const CSP_RULES_TABLE = 'csp_rules_table';
export const CSP_RULES_TABLE_BULK_MENU_BUTTON = 'csp_rules_table_bulk_menu_button';
export const CSP_RULES_TABLE_BULK_ENABLE_BUTTON = 'csp_rules_table_bulk_enable_button';
export const CSP_RULES_TABLE_BULK_DISABLE_BUTTON = 'csp_rules_table_bulk_disable_button';
export const CSP_RULES_TABLE_REFRESH_BUTTON = 'csp_rules_table_refresh_button';
export const CSP_RULES_TABLE_SELECT_ALL_BUTTON = 'rules_select_all';
export const CSP_RULES_TABLE_CLEAR_SELECTION_BUTTON = 'rules_clear_selection';
export const CSP_RULES_TABLE_ROW_ITEM = 'csp_rules_table_row_item';
export const CSP_RULES_TABLE_ROW_ITEM_NAME = 'csp_rules_table_row_item_name';
export const CSP_RULES_FLYOUT_CONTAINER = 'csp_rules_flyout_container';

export const getCspRulesTableItemSwitchTestId = (id: string) =>
  `${CSP_RULES_TABLE_ITEM_SWITCH}_${id}`;

export const getCspRulesTableRowItemTestId = (id: string) =>
  `${CSP_RULES_TABLE_ROW_ITEM_NAME}_${id}`;
