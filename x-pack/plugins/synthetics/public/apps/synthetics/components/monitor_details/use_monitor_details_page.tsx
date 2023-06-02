/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useParams } from 'react-router-dom';

import { MONITOR_NOT_FOUND_ROUTE } from '../../../../../common/constants';
import { ConfigKey } from '../../../../../common/runtime_types';
import { useMonitorListBreadcrumbs } from '../monitors_page/hooks/use_breadcrumbs';
import { useSelectedMonitor } from './hooks/use_selected_monitor';

export const useMonitorDetailsPage = () => {
  const { monitor, isMonitorMissing } = useSelectedMonitor();

  const { monitorId } = useParams<{ monitorId: string }>();

  useMonitorListBreadcrumbs(monitor ? [{ text: monitor?.name ?? '' }] : []);

  if (isMonitorMissing && monitor?.[ConfigKey.CONFIG_ID] !== monitorId) {
    return <Redirect to={MONITOR_NOT_FOUND_ROUTE.replace(':monitorId', monitorId)} />;
  }
  return null;
};
