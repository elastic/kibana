/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewType } from '../types';

export const FieldLabels: Record<string, string> = {
  'user_agent.name': 'Browser family',
  'user_agent.os.name': 'Operating system',
  'client.geo.country_name': 'Location',
  'user_agent.device.name': 'Device',
  'observer.geo.name': 'Observer location',
};

export const DataViewLabels: Record<DataViewType, string> = {
  'page-load-dist': 'Page load distribution',
  'page-views': 'Page views',
  'uptime-duration': 'Uptime monitor duration',
  'uptime-pings': 'Uptime pings',
};
