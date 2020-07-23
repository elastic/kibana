/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTableProps } from '@elastic/eui';

import { ListSchema } from '../../../../../lists/common/schemas/response';

export interface TableItem extends ListSchema {
  isDeleting: boolean;
  isExporting: boolean;
}
export type TableProps = EuiBasicTableProps<TableItem>;
export type TableItemCallback = (item: TableItem) => void;
