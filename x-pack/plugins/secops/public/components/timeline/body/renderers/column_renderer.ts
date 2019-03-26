/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineNonEcsData } from '../../../../graphql/types';
import { ColumnHeader } from '../column_headers/column_header';

export interface ColumnRenderer {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) => boolean;
  renderColumn: (
    {
      columnName,
      eventId,
      values,
      field,
      width,
    }: {
      columnName: string;
      eventId: string;
      values: string[] | null | undefined;
      field: ColumnHeader;
      width?: string;
    }
  ) => React.ReactNode;
}
