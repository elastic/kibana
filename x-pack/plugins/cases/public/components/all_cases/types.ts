/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/naming-convention */

export const sort_order = t.keyof({ asc: null, desc: null });
export type SortOrder = t.TypeOf<typeof sort_order>;

export interface EuiBasicTableSortTypes {
  field: string;
  direction: SortOrder;
}

export interface EuiBasicTableOnChange {
  page: {
    index: number;
    size: number;
  };
  sort?: EuiBasicTableSortTypes;
}
