/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { TimelineId } from '../../../../common/types/timeline';
import { SessionsView } from '../../../common/components/sessions_viewer';
import { hostNameExistsFilter } from '../../../common/components/visualization_actions/utils';
import { AlertsComponentQueryProps } from './types';

export const SessionsTabBody = React.memo((alertsProps: AlertsComponentQueryProps) => {
  const { pageFilters, filterQuery, ...rest } = alertsProps;
  const hostPageFilters = useMemo(
    () => (pageFilters != null ? [...hostNameExistsFilter, ...pageFilters] : hostNameExistsFilter),
    [pageFilters]
  );

  return (
    <SessionsView
      entityType="sessions"
      timelineId={TimelineId.hostsPageSessions}
      {...rest}
      pageFilters={hostPageFilters}
      filterQuery={filterQuery}
    />
  );
});

SessionsTabBody.displayName = 'SessionsTabBody';
