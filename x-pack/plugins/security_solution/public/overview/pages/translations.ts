/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS = i18n.translate('xpack.securitySolution.overview.eventsTitle', {
  defaultMessage: 'Event count',
});

export const NEWS_FEED_TITLE = i18n.translate(
  'xpack.securitySolution.overview.newsFeedSidebarTitle',
  {
    defaultMessage: 'Security news',
  }
);

export const PAGE_SUBTITLE = i18n.translate('xpack.securitySolution.overview.pageSubtitle', {
  defaultMessage: 'Security Information & Event Management with the Elastic Stack',
});

export const RECENT_CASES = i18n.translate(
  'xpack.securitySolution.overview.recentCasesSidebarTitle',
  {
    defaultMessage: 'Recent cases',
  }
);

export const RECENT_TIMELINES = i18n.translate(
  'xpack.securitySolution.overview.recentTimelinesSidebarTitle',
  {
    defaultMessage: 'Recent timelines',
  }
);

export const ALERT_COUNT = i18n.translate('xpack.securitySolution.overview.signalCountTitle', {
  defaultMessage: 'Detection alert trend',
});

export const TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.overview.topNLabel', {
    values: { fieldName },
    defaultMessage: `Top {fieldName}`,
  });

export const VIEW_ALERTS = i18n.translate('xpack.securitySolution.overview.viewAlertsButtonLabel', {
  defaultMessage: 'View alerts',
});

export const VIEW_EVENTS = i18n.translate('xpack.securitySolution.overview.viewEventsButtonLabel', {
  defaultMessage: 'View events',
});

export const DETECTION_RESPONSE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.pageTitle',
  {
    defaultMessage: 'Detection & Response',
  }
);
export const NO_PERMISSIONS_MSG = i18n.translate(
  'xpack.securitySolution.detectionResponse.noPagePermissionsMessage',
  {
    defaultMessage:
      'To view this page you must update privileges. For more information, contact your Kibana administrator.',
  }
);
export const NO_PERMISSIONS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.noPermissionsTitle',
  {
    defaultMessage: 'Privileges required',
  }
);
export const GO_TO_DOCUMENTATION = i18n.translate(
  'xpack.securitySolution.detectionResponse.goToDocumentationButton',
  {
    defaultMessage: 'View documentation',
  }
);
