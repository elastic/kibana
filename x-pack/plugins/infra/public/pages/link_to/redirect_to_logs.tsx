/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { DEFAULT_LOG_VIEW } from '../../observability_logs/log_view_state';

export const RedirectToLogs = () => {
  const { logViewId } = useParams<{ logViewId?: string }>();
  const location = useLocation();

  const {
    services: { locators },
  } = useKibanaContextForPlugin();

  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  useEffect(() => {
    locators.logsLocator.navigate(
      {
        time,
        filter,
        logView: { ...DEFAULT_LOG_VIEW, logViewId: logViewId || DEFAULT_LOG_VIEW.logViewId },
      },
      { replace: true }
    );
  }, [filter, locators.logsLocator, logViewId, time]);

  return null;
};
