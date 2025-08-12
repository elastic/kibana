/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType } from '@kbn/wci-common';
import SalesforceSvg from '../../../assets/salesforce.svg';
import GoogleDriveSvg from '../../../assets/google_drive.svg';
import SharepointSvg from '../../../assets/sharepoint.svg';
import SlackSvg from '../../../assets/slack.svg';
import ConfluenceSvg from '../../../assets/confluence.svg';
import JiraSvg from '../../../assets/jira.svg';
import GithubSvg from '../../../assets/github.svg';

export const integrationTypeToLabel = (type: IntegrationType) => {
  switch (type) {
    case IntegrationType.index_source:
      return 'Index Source';
    case IntegrationType.external_server:
      return 'External Server';
    case IntegrationType.salesforce:
      return 'Salesforce';
    case IntegrationType.google_drive:
      return 'Google Drive';
    case IntegrationType.sharepoint:
      return 'Sharepoint';
    case IntegrationType.slack:
      return 'Slack';
    case IntegrationType.confluence:
      return 'Confluence';
    case IntegrationType.jira:
      return 'Jira';
    case IntegrationType.github:
      return 'Github';
    default:
      return type;
  }
};

export const getIntegrationIcon = (type: IntegrationType) => {
  switch (type) {
    case IntegrationType.salesforce:
      return SalesforceSvg;
    case IntegrationType.index_source:
      return 'index';
    case IntegrationType.external_server:
      return 'database';
    case IntegrationType.google_drive:
      return GoogleDriveSvg;
    case IntegrationType.sharepoint:
      return SharepointSvg;
    case IntegrationType.slack:
      return SlackSvg;
    case IntegrationType.confluence:
      return ConfluenceSvg;
    case IntegrationType.jira:
      return JiraSvg;
    case IntegrationType.github:
      return GithubSvg;
    default:
      return '';
  }
};

export const isIntegrationDisabled = (type: IntegrationType) => {
  switch (type) {
    case IntegrationType.google_drive:
    case IntegrationType.sharepoint:
    case IntegrationType.slack:
    case IntegrationType.confluence:
    case IntegrationType.jira:
    case IntegrationType.github:
      return true;
    default:
      return false;
  }
};
