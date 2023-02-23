/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { PluginSetupContract, PluginStartContract } from '@kbn/actions-plugin/server';
import { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { EmailService, EmailServiceStart, IEmailServiceProvider } from './types';
import type { NotificationsConfigType } from '../config';
import { LicensedEmailService } from './licensed_email_service';
import { ConnectorsEmailService } from './connectors_email_service';
import { PLUGIN_ID } from '../../common';

const MINIMUM_LICENSE = 'platinum';

export interface EmailServiceSetupDeps {
  actions?: PluginSetupContract;
  licensing?: LicensingPluginSetup;
}

export interface EmailServiceStartDeps {
  actions?: PluginStartContract;
  licensing?: LicensingPluginStart;
}

export class EmailServiceProvider
  implements IEmailServiceProvider<EmailServiceSetupDeps, EmailServiceStartDeps>
{
  private setupSuccessful: boolean;
  private setupError: string;

  constructor(private config: NotificationsConfigType, private logger: Logger) {
    this.setupSuccessful = false;
    this.setupError = 'Email Service Error: setup() has not been run';
  }

  public setup(plugins: EmailServiceSetupDeps) {
    const { actions, licensing } = plugins;

    if (!actions || !licensing) {
      return this._registerInitializationError(
        `Error: 'actions' and 'licensing' plugins are required.`
      );
    }

    const emailConnector = this.config.connectors?.default?.email;
    if (!emailConnector) {
      return this._registerInitializationError('Error: Email connector not specified.', 'info');
    }

    if (!actions.isPreconfiguredConnector(emailConnector)) {
      return this._registerInitializationError(
        `Error: Unexisting email connector '${emailConnector}' specified.`
      );
    }

    this.setupSuccessful = true;
    this.setupError = '';
  }

  public start(plugins: EmailServiceStartDeps): EmailServiceStart {
    const { actions, licensing } = plugins;

    let email: EmailService;
    if (this.setupSuccessful && actions && licensing) {
      const emailConnector = this.config.connectors!.default!.email!;

      try {
        const unsecuredActionsClient = actions.getUnsecuredActionsClient();
        email = new LicensedEmailService(
          new ConnectorsEmailService(PLUGIN_ID, emailConnector, unsecuredActionsClient),
          licensing.license$,
          MINIMUM_LICENSE,
          this.logger
        );
      } catch (err) {
        this._registerInitializationError(err);
      }
    }

    return {
      isEmailServiceAvailable: () => !!email,
      getEmailService: () => {
        if (!email) {
          throw new Error(this.setupError);
        }
        return email;
      },
    };
  }

  private _registerInitializationError(error: string, level: 'info' | 'warn' = 'warn') {
    const message = `Email Service ${error}`;
    this.setupError = message;
    if (level === 'info') {
      this.logger.info(message);
    } else {
      this.logger.warn(message);
    }
  }
}
