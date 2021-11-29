/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { ExploratoryViewContextProvider, ExploratoryView } from '../../../../observability/public';
import { getSecurityKPIConfig } from './kpi_over_time_config';
import { RenderAppProps } from '../types';
import { getSecurityAlertsKPIConfig } from './alert_kpi_over_time_config';

export const reportConfigMap = {
  security: [getSecurityKPIConfig],
  securityAlerts: [getSecurityAlertsKPIConfig],
};

export const indexPatternList = {
  security:
    'remote_cluster:-*elastic-cloud-logs-*,remote_cluster:apm-*-transaction*,remote_cluster:traces-apm*,remote_cluster:auditbeat-*,remote_cluster:endgame-*,remote_cluster:filebeat-*,remote_cluster:logs-*,remote_cluster:packetbeat-*,remote_cluster:winlogbeat-*',
  securityAlerts: 'remote_cluster:.internal.alerts-security.alerts-default-*',
};

export const dataTypes: any = [
  {
    id: 'security',
    label: 'Security',
  },
  {
    id: 'securityAlerts',
    label: 'Security alerts',
  },
];

export const reportTypes = [{ reportType: 'kpi-over-time', label: 'KPI over time' }];

export const SecurityExploratoryView = ({
  setHeaderActionMenu,
}: {
  setHeaderActionMenu: RenderAppProps['setHeaderActionMenu'];
}) => {
  return (
    <ExploratoryViewContextProvider
      reportTypes={reportTypes}
      dataTypes={dataTypes}
      indexPatterns={indexPatternList}
      reportConfigMap={reportConfigMap}
      setHeaderActionMenu={setHeaderActionMenu}
      asPanel={false}
    >
      <ExploratoryView app={{ id: 'security', label: 'Security' }} />
    </ExploratoryViewContextProvider>
  );
};
