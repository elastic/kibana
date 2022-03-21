/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OVERVIEW = i18n.translate('xpack.securitySolution.navigation.overview', {
  defaultMessage: 'Overview',
});

export const DETECTION_RESPONSE = i18n.translate(
  'xpack.securitySolution.navigation.detectionResponse',
  {
    defaultMessage: 'Detection & Response',
  }
);

export const HOSTS = i18n.translate('xpack.securitySolution.navigation.hosts', {
  defaultMessage: 'Hosts',
});

export const NETWORK = i18n.translate('xpack.securitySolution.navigation.network', {
  defaultMessage: 'Network',
});

export const USERS = i18n.translate('xpack.securitySolution.navigation.users', {
  defaultMessage: 'Users',
});

export const RULES = i18n.translate('xpack.securitySolution.navigation.rules', {
  defaultMessage: 'Rules',
});

export const EXCEPTIONS = i18n.translate('xpack.securitySolution.navigation.exceptions', {
  defaultMessage: 'Exception lists',
});

export const ALERTS = i18n.translate('xpack.securitySolution.navigation.alerts', {
  defaultMessage: 'Alerts',
});

export const TIMELINES = i18n.translate('xpack.securitySolution.navigation.timelines', {
  defaultMessage: 'Timelines',
});

export const CASE = i18n.translate('xpack.securitySolution.navigation.case', {
  defaultMessage: 'Cases',
});

export const ADMINISTRATION = i18n.translate('xpack.securitySolution.navigation.administration', {
  defaultMessage: 'Administration',
});
export const ENDPOINTS = i18n.translate('xpack.securitySolution.search.administration.endpoints', {
  defaultMessage: 'Endpoints',
});
export const POLICIES = i18n.translate(
  'xpack.securitySolution.navigation.administration.policies',
  {
    defaultMessage: 'Policies',
  }
);
export const TRUSTED_APPLICATIONS = i18n.translate(
  'xpack.securitySolution.search.administration.trustedApps',
  {
    defaultMessage: 'Trusted applications',
  }
);
export const EVENT_FILTERS = i18n.translate(
  'xpack.securitySolution.search.administration.eventFilters',
  {
    defaultMessage: 'Event filters',
  }
);

export const HOST_ISOLATION_EXCEPTIONS = i18n.translate(
  'xpack.securitySolution.search.administration.hostIsolationExceptions',
  {
    defaultMessage: 'Host isolation exceptions',
  }
);
export const DETECT = i18n.translate('xpack.securitySolution.navigation.detect', {
  defaultMessage: 'Detect',
});
export const EXPLORE = i18n.translate('xpack.securitySolution.navigation.explore', {
  defaultMessage: 'Explore',
});
export const INVESTIGATE = i18n.translate('xpack.securitySolution.navigation.investigate', {
  defaultMessage: 'Investigate',
});
export const MANAGE = i18n.translate('xpack.securitySolution.navigation.manage', {
  defaultMessage: 'Manage',
});

export const BLOCKLIST = i18n.translate('xpack.securitySolution.navigation.blocklist', {
  defaultMessage: 'Blocklist',
});

export const GO_TO_DOCUMENTATION = i18n.translate(
  'xpack.securitySolution.goToDocumentationButton',
  {
    defaultMessage: 'View documentation',
  }
);

export const NO_PERMISSIONS_MSG = (subPluginKey: string) =>
  i18n.translate('xpack.securitySolution.noPermissionsMessage', {
    values: { subPluginKey },
    defaultMessage:
      'To view {subPluginKey}, you must update privileges. For more information, contact your Kibana administrator.',
  });

export const NO_PERMISSIONS_TITLE = i18n.translate('xpack.securitySolution.noPermissionsTitle', {
  defaultMessage: 'Privileges required',
});
