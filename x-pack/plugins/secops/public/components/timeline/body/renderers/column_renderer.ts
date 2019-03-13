/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../../../../graphql/types';
import { ColumnHeader } from '../column_headers/column_header';

export interface ColumnRenderer {
  isInstance: (columnName: string, data: Ecs) => boolean;
  renderColumn: (
    {
      columnName,
      eventId,
      value,
      field,
      width,
    }: {
      columnName: string;
      eventId: string;
      value: string | number | object | undefined | null;
      field: ColumnHeader;
      width?: string;
    }
  ) => React.ReactNode;
}
