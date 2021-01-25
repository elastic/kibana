/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UptimeAlertTypeFactory } from './types';
import { statusCheckAlertFactory, ActionGroupIds as statusCheckActionGroup } from './status_check';
import { tlsAlertFactory, ActionGroupIds as tlsActionGroup } from './tls';
import {
  durationAnomalyAlertFactory,
  ActionGroupIds as durationAnomalyActionGroup,
} from './duration_anomaly';

export const uptimeAlertTypeFactories: [
  UptimeAlertTypeFactory<statusCheckActionGroup>,
  UptimeAlertTypeFactory<tlsActionGroup>,
  UptimeAlertTypeFactory<durationAnomalyActionGroup>
] = [statusCheckAlertFactory, tlsAlertFactory, durationAnomalyAlertFactory];
