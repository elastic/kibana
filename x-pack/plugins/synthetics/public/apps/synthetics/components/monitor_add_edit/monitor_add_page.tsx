/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';

export const MonitorAddPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'add-monitor' });
  useTrackPageview({ app: 'synthetics', path: 'add-monitor', delay: 15000 });
  useMonitorAddEditBreadcrumbs();

  return (
    <MonitorForm>
      <MonitorSteps />
    </MonitorForm>
  );
};
