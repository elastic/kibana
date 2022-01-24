/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

import { ExploratoryViewContextProvider, ExploratoryView } from '../../../../observability/public';
import {
  getSecurityKPIConfig,
  getSecurityUniqueIpsKPIConfig,
  getSingleMetricConfig,
  getSecurityAuthenticationsConfig,
  getSecurityUniquePrivateIpsKPIConfig,
} from './kpi_over_time_config';
import { RenderAppProps } from '../types';
import { getSecurityAlertsKPIConfig } from './alert_kpi_over_time_config';
// export from obsverabillity
import { AppDataType } from '../../../../observability/public/components/shared/exploratory_view/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';

export const reportConfigMap = {
  security: [
    getSecurityKPIConfig,
    getSecurityUniqueIpsKPIConfig,
    getSingleMetricConfig,
    getSecurityAuthenticationsConfig,
    getSecurityUniquePrivateIpsKPIConfig,
  ],
  securityAlerts: [getSecurityAlertsKPIConfig],
};

export const indexPatternList = {
  security:
    'apm-*-transaction*,traces-apm*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*,.alerts-security.alerts-default',
  // 'remote_cluster:.alerts-security.alerts-default,remote_cluster:apm-*-transaction*,remote_cluster:auditbeat-*,remote_cluster:endgame-*,remote_cluster:filebeat-*,remote_cluster:logs-*,remote_cluster:packetbeat-*,remote_cluster:traces-apm*,remote_cluster:winlogbeat-*',
  securityAlerts: '.alerts-security.alerts-default-*',
};

export const dataTypes = [
  {
    id: 'security' as AppDataType,
    label: 'Security',
  },
  {
    id: 'securityAlerts' as AppDataType,
    label: 'Security alerts',
  },
];

export const reportTypes = [
  { reportType: 'kpi-over-time', label: 'KPI over time' },
  { reportType: 'event_outcome', label: 'bar' },
  { reportType: 'unique_ip', label: 'Unique IPs' },
  { reportType: 'events', label: 'events' },
  { reportType: 'unique_private_ip', label: 'Unique IPs' },
  { reportType: 'singleMetric', label: 'Single metric' },
];

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
