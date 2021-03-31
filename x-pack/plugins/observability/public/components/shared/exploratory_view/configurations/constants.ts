/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDataType, ReportViewTypeId } from '../types';
import {
  CLS_FIELD,
  FCP_FIELD,
  FID_FIELD,
  LCP_FIELD,
  TBT_FIELD,
} from './data/elasticsearch_fieldnames';

export const FieldLabels: Record<string, string> = {
  'user_agent.name': 'Browser family',
  'user_agent.version': 'Browser version',
  'user_agent.os.name': 'Operating system',
  'client.geo.country_name': 'Location',
  'user_agent.device.name': 'Device',
  'observer.geo.name': 'Observer location',
  'service.name': 'Service Name',
  'service.environment': 'Environment',

  [LCP_FIELD]: 'Largest contentful paint',
  [FCP_FIELD]: 'First contentful paint',
  [TBT_FIELD]: 'Total blocking time',
  [FID_FIELD]: 'First input delay',
  [CLS_FIELD]: 'Cumulative layout shift',

  'monitor.id': 'Monitor Id',
  'monitor.status': 'Monitor Status',

  'agent.hostname': 'Agent host',
  'host.hostname': 'Host name',
  'monitor.name': 'Monitor name',
  'monitor.type': 'Monitor Type',
  'url.port': 'Port',
  tags: 'Tags',

  // custom

  'performance.metric': 'Metric',
  'Business.KPI': 'KPI',
};

export const DataViewLabels: Record<ReportViewTypeId, string> = {
  pld: 'Performance Distribution',
  upd: 'Uptime monitor duration',
  upp: 'Uptime pings',
  svl: 'APM Service latency',
  kpi: 'KPI over time',
  tpt: 'APM Service throughput',
  cpu: 'System CPU Usage',
  logs: 'Logs Frequency',
  mem: 'System Memory Usage',
  nwk: 'Network Activity',
};

export const ReportToDataTypeMap: Record<ReportViewTypeId, AppDataType> = {
  upd: 'synthetics',
  upp: 'synthetics',
  tpt: 'apm',
  svl: 'apm',
  kpi: 'rum',
  pld: 'rum',
  nwk: 'metrics',
  mem: 'metrics',
  logs: 'logs',
  cpu: 'metrics',
};
