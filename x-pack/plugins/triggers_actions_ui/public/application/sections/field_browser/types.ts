/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';

/**
 * An item rendered in the table
 */
export interface BrowserFieldItem {
  name: string;
  type?: string;
  description?: string;
  example?: string;
  category: string;
  selected: boolean;
  isRuntime: boolean;
}

export type OnFieldSelected = (fieldId: string) => void;

export type CreateFieldComponent = React.FC<{
  onHide: () => void;
}>;
export type FieldTableColumns = Array<EuiBasicTableColumn<BrowserFieldItem>>;
export type GetFieldTableColumns = (params: {
  highlight: string;
  onHide: () => void;
}) => FieldTableColumns;
export interface FieldBrowserOptions {
  createFieldButton?: CreateFieldComponent;
  getFieldTableColumns?: GetFieldTableColumns;
}

export interface FieldBrowserProps {
  /** The timeline's current column headers */
  columnIds: string[];
  /** A map of categoryId -> metadata about the fields in that category */
  browserFields: BrowserFields;
  /** When true, this Fields Browser is being used as an "events viewer" */
  isEventViewer?: boolean;
  /** Callback to reset the default columns */
  onResetColumns: () => void;
  /** Callback to toggle a field column */
  onToggleColumn: (columnId: string) => void;
  /** The options to customize the field browser, supporting columns rendering and button to create fields */
  options?: FieldBrowserOptions;
  /** The width of the field browser */
  width?: number;
}
