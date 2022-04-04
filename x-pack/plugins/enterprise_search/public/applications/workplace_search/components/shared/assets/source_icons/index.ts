/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import box from './box.svg';
import confluence from './confluence.svg';
import custom from './custom.svg';
import dropbox from './dropbox.svg';
import github from './github.svg';
import gmail from './gmail.svg';
import googleDrive from './google_drive.svg';
import jira from './jira.svg';
import jiraServer from './jira_server.svg';
import loadingSmall from './loading_small.svg';
import oneDrive from './onedrive.svg';
import salesforce from './salesforce.svg';
import serviceNow from './servicenow.svg';
import sharePoint from './sharepoint.svg';
import sharePointServer from './sharepoint_server.svg';
import slack from './slack.svg';
import zendesk from './zendesk.svg';

export const images = {
  box,
  confluence,
  confluenceCloud: confluence,
  confluenceServer: confluence,
  custom,
  dropbox,
  // TODO: For now external sources are all SharePoint. When this is no longer the case, this needs to be dynamic.
  external: sharePoint,
  github,
  githubEnterpriseServer: github,
  githubViaApp: github,
  githubEnterpriseServerViaApp: github,
  gmail,
  googleDrive,
  jira,
  jiraServer,
  jiraCloud: jira,
  loadingSmall,
  oneDrive,
  salesforce,
  salesforceSandbox: salesforce,
  serviceNow,
  sharePoint,
  sharePointServer,
  slack,
  zendesk,
} as { [key: string]: string };
