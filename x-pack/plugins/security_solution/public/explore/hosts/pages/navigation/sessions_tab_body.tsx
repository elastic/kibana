/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { TableId } from '../../../../../common/types';
import { SessionsView } from '../../../../common/components/sessions_viewer';
import { hostNameExistsFilter } from '../../../../common/components/visualization_actions/utils';
import { useLicense } from '../../../../common/hooks/use_license';
import type { AlertsComponentQueryProps } from './types';

export const SessionsTabBody = React.memo((alertsProps: AlertsComponentQueryProps) => {
  const { pageFilters, filterQuery, ...rest } = alertsProps;
  const hostPageFilters = useMemo(
    () => (pageFilters != null ? [...hostNameExistsFilter, ...pageFilters] : hostNameExistsFilter),
    [pageFilters]
  );
  const isEnterprisePlus = useLicense().isEnterprise();

  return isEnterprisePlus ? (
    <SessionsView
      entityType="sessions"
      tableId={TableId.hostsPageSessions}
      {...rest}
      pageFilters={hostPageFilters}
      filterQuery={filterQuery}
    />
  ) : null;
});

SessionsTabBody.displayName = 'SessionsTabBody';
