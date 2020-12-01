/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import confluence from './confluence.svg';
import custom from './custom.svg';
import dropbox from './dropbox.svg';
import github from './github.svg';
import gmail from './gmail.svg';
import googleDrive from './google_drive.svg';
import jira from './jira.svg';
import jiraServer from './jira_server.svg';
import oneDrive from './onedrive.svg';
import salesforce from './salesforce.svg';
import serviceNow from './servicenow.svg';
import sharePoint from './sharepoint.svg';
import slack from './slack.svg';
import zendesk from './zendesk.svg';

export const imagesFull = {
  confluence,
  confluenceCloud: confluence,
  confluenceServer: confluence,
  custom,
  dropbox,
  github,
  githubEnterpriseServer: github,
  gmail,
  googleDrive,
  jira,
  jiraServer,
  jiraCloud: jira,
  oneDrive,
  salesforce,
  salesforceSandbox: salesforce,
  serviceNow,
  sharePoint,
  slack,
  zendesk,
} as { [key: string]: string };
