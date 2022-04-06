/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { Logger } from '@kbn/logging';
import {
  ExecutorParams,
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
} from '../../../builtin_action_types/jira/types';
import { ActionsConfigurationUtilities } from '../../../actions_config';
import { CaseConnector } from '../../case';

export class Jira extends CaseConnector<unknown> {
  constructor({
    config,
    configurationUtilities,
    logger,
    params,
    secrets,
  }: {
    config: JiraPublicConfigurationType;
    configurationUtilities: ActionsConfigurationUtilities;
    logger: Logger;
    params: ExecutorParams;
    secrets: JiraSecretConfigurationType;
  }) {
    const { apiUrl: url, projectKey } = config;
    const { apiToken, email } = secrets;

    if (!url || !projectKey || !apiToken || !email) {
      throw Error(`[Action]i18n.NAME: Wrong configuration.`);
    }

    const axiosInstance = axios.create({
      auth: { username: email, password: apiToken },
    });
    super(axiosInstance, configurationUtilities, logger);
  }

  createIncident(incident: Partial<unknown>): Promise<unknown> {}
}
