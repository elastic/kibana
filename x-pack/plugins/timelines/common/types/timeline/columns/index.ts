/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IFieldSubType } from '../../../../../../../src/plugins/data/public';
import { TimelineNonEcsData } from '../../../search_strategy/timeline';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

/** The specification of a column header */
export type ColumnHeaderOptions = Pick<
  EuiDataGridColumn,
  'display' | 'displayAsText' | 'id' | 'initialWidth'
> & {
  aggregatable?: boolean;
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string;
  example?: string;
  format?: string;
  linkField?: string;
  placeholder?: string;
  subType?: IFieldSubType;
  type?: string;
};

export interface ColumnRenderer {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) => boolean;
  renderColumn: ({
    columnName,
    eventId,
    field,
    timelineId,
    truncate,
    values,
    linkValues,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    timelineId: string;
    truncate?: boolean;
    values: string[] | null | undefined;
    linkValues?: string[] | null | undefined;
  }) => React.ReactNode;
}
