/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useRouteMatch } from 'react-router-dom';
import {
  CERTIFICATES_ROUTE,
  OVERVIEW_ROUTE,
  SETTINGS_ROUTE,
  MONITOR_ROUTE,
} from '../../common/constants';

export const useRouteChange = () => {
  const certPage = useRouteMatch(CERTIFICATES_ROUTE);
  const settingsPage = useRouteMatch(SETTINGS_ROUTE);
  const overviewPage = useRouteMatch(OVERVIEW_ROUTE);
  const monitorPage = useRouteMatch(MONITOR_ROUTE);

  useEffect(() => {
    if (overviewPage) {
      document.title = 'Uptime - Kibana';
    }
    if (monitorPage) {
      document.title = 'Monitor | Uptime - Kibana';
    }
    if (certPage) {
      document.title = 'Certificates | Uptime - Kibana';
    }
    if (settingsPage) {
      document.title = 'Settings | Uptime - Kibana';
    }
  });
};
