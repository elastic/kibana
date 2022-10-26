/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PluginSetupContract, PluginStartContract } from '@kbn/actions-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { ConnectorsEmailService } from './connectors_email_service';
import type { EmailService } from './types';
import { PLUGIN_ID } from '../../common';
import type { ConnectorsEmailConfigType } from '../config/connectors_email_config';
import { LicensedEmailService } from './licensed_email_service';

export interface EmailServiceSetupDeps {
  actions?: PluginSetupContract;
  licensing?: LicensingPluginSetup;
}

export interface EmailServiceStartDeps {
  actions?: PluginStartContract;
  licensing?: LicensingPluginStart;
}

export interface CheckEmailServiceParams {
  config: ConnectorsEmailConfigType;
  plugins: EmailServiceSetupDeps;
}

export interface EmailServiceFactoryParams {
  config: ConnectorsEmailConfigType;
  plugins: EmailServiceStartDeps;
  logger: Logger;
}

export function checkEmailServiceConfiguration(params: CheckEmailServiceParams) {
  const {
    config,
    plugins: { actions, licensing },
  } = params;

  if (!actions || !licensing) {
    throw new Error(`'actions' and 'licensing' plugins are required.`);
  }

  const emailConnector = config.connectors?.default?.email;
  if (!emailConnector) {
    throw new Error('Email connector not specified.');
  }

  if (!actions.isPreconfiguredConnector(emailConnector)) {
    throw new Error(`Unexisting email connector '${emailConnector}' specified.`);
  }
}

export function getEmailService(params: EmailServiceFactoryParams): EmailService | undefined {
  const {
    config,
    plugins: { actions, licensing },
    logger,
  } = params;

  const unsecuredActionsClient = actions?.getUnsecuredActionsClient();
  const emailConnector = config.connectors?.default?.email;

  if (licensing && unsecuredActionsClient && emailConnector) {
    return new LicensedEmailService(
      new ConnectorsEmailService(PLUGIN_ID, emailConnector, unsecuredActionsClient),
      licensing.license$,
      'platinum',
      logger
    );
  }
}
