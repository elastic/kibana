/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_LOG_VIEW, getLogsLocatorsFromUrlService } from '@kbn/logs-shared-plugin/common';
import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

export const RedirectToLogs = () => {
  const { logViewId } = useParams<{ logViewId?: string }>();
  const location = useLocation();

  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const { logsLocator } = getLogsLocatorsFromUrlService(share.url);

  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  useEffect(() => {
    logsLocator.navigate(
      {
        time,
        filter,
        logView: { ...DEFAULT_LOG_VIEW, logViewId: logViewId || DEFAULT_LOG_VIEW.logViewId },
      },
      { replace: true }
    );
  }, [filter, logsLocator, logViewId, time]);

  return null;
};
