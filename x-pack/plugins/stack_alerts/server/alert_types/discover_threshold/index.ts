/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup } from 'kibana/server';
import { Logger } from 'src/core/server';
import { AlertingSetup, StackAlertsStartDeps } from '../../types';
import { getAlertType } from './alert_type';
import { SharePluginSetup } from '../../../../../../src/plugins/share/server';

interface RegisterParams {
  logger: Logger;
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>;
  alerting: AlertingSetup;
  share: SharePluginSetup;
  core: CoreSetup;
}

export function register(params: RegisterParams) {
  const { logger, share, alerting, core } = params;
  alerting.registerType(getAlertType(logger, share, core));
}
