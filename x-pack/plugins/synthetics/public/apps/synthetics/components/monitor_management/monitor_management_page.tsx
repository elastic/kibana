/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useMonitorManagementBreadcrumbs } from './use_breadcrumbs';

export const MonitorManagementPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'manage-monitors' });
  useTrackPageview({ app: 'synthetics', path: 'manage-monitors', delay: 15000 });
  useMonitorManagementBreadcrumbs();

  return (
    <>
      <p>Monitor Management List page (Monitor Management Page)</p>
    </>
  );
};
