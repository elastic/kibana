/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { ColumnHeaderOptions, RowRenderer } from '../../../../../../common/types';
import type { ColumnRenderer } from './column_renderer';
import { plainColumnRenderer } from './plain_column_renderer';
import { profileUidColumns } from '../../../../../detections/configurations/security_solution_detections/fetch_page_context';
import type { RenderCellValueContext } from '../../../../../detections/configurations/security_solution_detections/fetch_page_context';

export const userProfileColumnRenderer: ColumnRenderer = {
  isInstance: (columnName) => profileUidColumns.includes(columnName),
  renderColumn: ({
    columnName,
    ecsData,
    eventId,
    field,
    isDetails,
    isDraggable = true,
    linkValues,
    rowRenderers = [],
    scopeId,
    truncate,
    values,
    context,
  }: {
    columnName: string;
    ecsData?: Ecs;
    eventId: string;
    field: ColumnHeaderOptions;
    isDetails?: boolean;
    isDraggable?: boolean;
    linkValues?: string[] | null | undefined;
    rowRenderers?: RowRenderer[];
    scopeId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
    context?: RenderCellValueContext;
  }) => {
    // Show spinner if loading profiles or if there are no fetched profiles yet
    // Do not show the loading spinner if context is not provided at all
    if (context?.isLoading) {
      return <EuiLoadingSpinner size="s" />;
    }

    const displayNames = values?.map((uid) => {
      const userProfile = context?.profiles?.find((user) => uid === user.uid)?.user;
      return userProfile ? getUserDisplayName(userProfile) : uid;
    });
    return plainColumnRenderer.renderColumn({
      columnName,
      eventId,
      field,
      isDetails,
      isDraggable,
      linkValues,
      scopeId,
      truncate,
      values: displayNames,
    });
  },
};
