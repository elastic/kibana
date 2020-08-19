/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import servicenowLogo from './servicenow/logo.svg';
import pagerDutySvg from './pagerduty/pagerduty.svg';

interface ConnectorIcons {
  [key: string]: string;
}

const CONNECTION_ICONS: ConnectorIcons = {
  '.index': 'indexOpen',
  '.slack': 'logoSlack',
  '.email': 'email',
  '.server-log': 'logsApp',
  '.webhook': 'logoWebhook',
  '.jira': 'logoWebhook',
  '.pagerduty': pagerDutySvg,
  '.servicenow': servicenowLogo,
};

export const getActionTypeIcon = (actionType: string) => {
  return CONNECTION_ICONS[actionType];
};
