/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineNonEcsData } from '../../../../../graphql/types';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';

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
