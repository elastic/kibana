/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { TimelineId } from '../../../../common/types/timeline';
import { AlertsView } from '../../../common/components/alerts_viewer';
import { filterHostExternalAlertData } from '../../../common/components/visualization_actions/utils';
import { AlertsComponentQueryProps } from './types';

export const HostAlertsQueryTabBody = React.memo((alertsProps: AlertsComponentQueryProps) => {
  const { pageFilters, ...rest } = alertsProps;
  const hostPageFilters = useMemo(
    () =>
      pageFilters != null
        ? [...filterHostExternalAlertData, ...pageFilters]
        : filterHostExternalAlertData,
    [pageFilters]
  );

  return (
    <AlertsView
      entityType="events"
      timelineId={TimelineId.hostsPageExternalAlerts}
      {...rest}
      pageFilters={hostPageFilters}
    />
  );
});

HostAlertsQueryTabBody.displayName = 'HostAlertsQueryTabBody';
