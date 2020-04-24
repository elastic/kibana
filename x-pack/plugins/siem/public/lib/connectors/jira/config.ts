/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorConfiguration } from './types';

import { JIRA_TITLE } from './translations';
import logo from './logo.svg';

export const connector: ConnectorConfiguration = {
  id: '.jira',
  name: JIRA_TITLE,
  logo,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'platinum',
  fields: {
    summary: {
      label: 'Summary',
      validSourceFields: ['title', 'description'],
      defaultSourceField: 'title',
      defaultActionType: 'overwrite',
    },
    description: {
      label: 'Description',
      validSourceFields: ['title', 'description'],
      defaultSourceField: 'description',
      defaultActionType: 'overwrite',
    },
    comments: {
      label: 'Comments',
      validSourceFields: ['comments'],
      defaultSourceField: 'comments',
      defaultActionType: 'append',
    },
  },
};
