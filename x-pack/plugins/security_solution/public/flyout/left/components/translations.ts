/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ANALYZER_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.analyzerErrorMessage',
  {
    defaultMessage: 'analyzer',
  }
);

export const SESSION_VIEW_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.sessionViewErrorMessage',
  {
    defaultMessage: 'session view',
  }
);

export const USERS_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.usersTitle', {
  defaultMessage: 'Users',
});

export const USERS_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.usersInfoTitle',
  {
    defaultMessage: 'User info',
  }
);

export const RELATED_HOSTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedHostsTitle',
  {
    defaultMessage: 'Related hosts',
  }
);

export const RELATED_HOSTS_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedHostsToolTip',
  {
    defaultMessage: 'The user successfully authenticated to these hosts after the alert.',
  }
);

export const RELATED_ENTITIES_NAME_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedEntitiesNameColumn',
  {
    defaultMessage: 'Name',
  }
);

export const RELATED_ENTITIES_IP_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedEntitiesIpColumn',
  {
    defaultMessage: 'Ip addresses',
  }
);

export const HOSTS_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.hostsTitle', {
  defaultMessage: 'Hosts',
});

export const HOSTS_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.hostsInfoTitle',
  {
    defaultMessage: 'Host info',
  }
);

export const RELATED_USERS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedUsersTitle',
  {
    defaultMessage: 'Related users',
  }
);

export const RELATED_USERS_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedUsersToolTip',
  {
    defaultMessage: 'These users successfully authenticated to the affected host after the alert.',
  }
);
