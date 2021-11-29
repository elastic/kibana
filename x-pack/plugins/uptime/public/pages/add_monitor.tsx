/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTrackPageview } from '../../../observability/public';
import { SyntheticsProviders } from '../components/fleet_package/contexts';
import { MonitorConfig } from '../components/monitor_management/monitor_config';

export const AddMonitorPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'add-monitor' });
  useTrackPageview({ app: 'uptime', path: 'add-monitor', delay: 15000 });

  return (
    <SyntheticsProviders>
      <MonitorConfig />
    </SyntheticsProviders>
  );
};
