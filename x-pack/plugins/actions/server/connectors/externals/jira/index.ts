/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosBasicCredentials } from 'axios';
import { Logger } from '@kbn/logging';
import {
  ExecutorParams,
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
} from '../../../builtin_action_types/jira/types';
import { ActionsConfigurationUtilities } from '../../../actions_config';
import { CaseConnector } from '../../case';

const VERSION = '2';
const BASE_URL = `rest/api/${VERSION}`;
const CAPABILITIES_URL = `rest/capabilities`;

const VIEW_INCIDENT_URL = `browse`;

const createMetaCapabilities = ['list-project-issuetypes', 'list-issuetype-fields'];

export class Jira extends CaseConnector<unknown> {
  private secrets: JiraSecretConfigurationType;
  private urls: {
    basic: string;
    incidentUrl: string;
    capabilitiesUrl: string;
    commentUrl: string;
    getIssueTypesOldAPIURL: string;
    getIssueTypeFieldsOldAPIURL: string;
    getIssueTypesUrl: string;
    getIssueTypeFieldsUrl: string;
    searchUrl: string;
    getIncidentViewURL: (key: string) => string;
    getCommentsURL: (issueId: string) => string;
    createGetIssueTypeFieldsUrl: (uri: string, issueTypeId: string) => string;
  };

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

    super(configurationUtilities, logger);
    this.secrets = secrets;

    this.urls = {
      basic: url,
      incidentUrl: `${url}/${BASE_URL}/issue`,
      capabilitiesUrl: `${url}/${CAPABILITIES_URL}`,
      commentUrl: `${url}/${BASE_URL}/issue/{issueId}/comment`,
      getIssueTypesOldAPIURL: `${url}/${BASE_URL}/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`,
      getIssueTypeFieldsOldAPIURL: `${url}/${BASE_URL}/issue/createmeta?projectKeys=${projectKey}&issuetypeIds={issueTypeId}&expand=projects.issuetypes.fields`,
      getIssueTypesUrl: `${url}/${BASE_URL}/issue/createmeta/${projectKey}/issuetypes`,
      getIssueTypeFieldsUrl: `${url}/${BASE_URL}/issue/createmeta/${projectKey}/issuetypes/{issueTypeId}`,
      searchUrl: `${url}/${BASE_URL}/search`,
      getIncidentViewURL: (key: string) => {
        return `${url}/${VIEW_INCIDENT_URL}/${key}`;
      },
      getCommentsURL: (issueId: string) => {
        return this.urls.commentUrl.replace('{issueId}', issueId);
      },
      createGetIssueTypeFieldsUrl: (uri: string, issueTypeId: string) => {
        return uri.replace('{issueTypeId}', issueTypeId);
      },
    };
  }

  getBasicAuth(): AxiosBasicCredentials {
    return { username: this.secrets.email, password: this.secrets.apiToken };
  }

  createIncident(incident: Partial<unknown>): Promise<unknown> {}
}
