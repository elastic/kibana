/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { ConnectorsEmailService } from './connectors_email_service';
import type { EmailService } from './types';
import { PLUGIN_ID } from '../../common';
import type { ConnectorsEmailConfigType } from '../config/connectors_email_config';

export interface EmailServiceStartDeps {
  actions?: ActionsPluginStartContract;
}

export interface EmailServiceFactoryParams {
  config: ConnectorsEmailConfigType;
  plugins: EmailServiceStartDeps;
}

export function getEmailService(params: EmailServiceFactoryParams): EmailService {
  const {
    config,
    plugins: { actions },
  } = params;

  if (!actions) {
    throw new Error(`'actions' plugin not available.`);
  }

  const emailConnector = config.connectors?.default?.email;
  if (!emailConnector) {
    throw new Error('Email connector not specified');
  }

  if (!actions.isPreconfiguredConnector(emailConnector)) {
    throw new Error(`Unexisting email connector '${emailConnector}' specified`);
  }

  actions.registerUnsecuredActionsClientAccess(PLUGIN_ID);

  const unsecuredActionsClient = actions.getUnsecuredActionsClient();
  return new ConnectorsEmailService(PLUGIN_ID, emailConnector, unsecuredActionsClient);
}
