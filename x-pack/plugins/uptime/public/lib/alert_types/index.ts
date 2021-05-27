/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { FormattableAlertTypeModel } from '../../../../observability/public';
import { initMonitorStatusAlertType } from './monitor_status';
import { initTlsAlertType } from './tls';
import { ClientPluginsStart } from '../../apps/plugin';
import { initDurationAnomalyAlertType } from './duration_anomaly';

export type AlertTypeInitializer = (dependenies: {
  core: CoreStart;
  plugins: ClientPluginsStart;
}) => FormattableAlertTypeModel;

export const alertTypeInitializers: AlertTypeInitializer[] = [
  initMonitorStatusAlertType,
  initTlsAlertType,
  initDurationAnomalyAlertType,
];
