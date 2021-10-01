/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableProps } from '@elastic/eui';

import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';

export interface TableItem extends ListSchema {
  isDeleting: boolean;
  isExporting: boolean;
}
export type TableProps = EuiBasicTableProps<TableItem>;
export type TableItemCallback = (item: TableItem) => void;
