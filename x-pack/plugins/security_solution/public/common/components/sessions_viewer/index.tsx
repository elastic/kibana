/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SessionsComponentsProps } from './types';
import { SessionsTable } from './sessions_table';

const SessionsViewComponent: React.FC<SessionsComponentsProps> = ({
  timelineId,
  endDate,
  entityType,
  pageFilters,
  startDate,
  filterQuery,
}) => {
  return (
    <SessionsTable
      timelineId={timelineId}
      endDate={endDate}
      entityType={entityType}
      startDate={startDate}
      pageFilters={pageFilters}
      filterQuery={filterQuery}
    />
  );
};

SessionsViewComponent.displayName = 'SessionsViewComponent';

export const SessionsView = React.memo(SessionsViewComponent);
