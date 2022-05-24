/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TimelineId } from '../../../../common/types/timeline';
import { AlertsView } from '../../../common/components/alerts_viewer';
import { NetworkComponentQueryProps } from './types';
import { filterNetworkExternalAlertData } from '../../../common/components/visualization_actions/utils';

export const NetworkAlertsQueryTabBody = React.memo((alertsProps: NetworkComponentQueryProps) => (
  <AlertsView
    entityType="events"
    timelineId={TimelineId.networkPageExternalAlerts}
    {...alertsProps}
    pageFilters={filterNetworkExternalAlertData}
  />
));

NetworkAlertsQueryTabBody.displayName = 'NetworkAlertsQueryTabBody';
