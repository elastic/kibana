/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FILTER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterDescription',
  {
    defaultMessage: 'Events from the data providers above are filtered by the adjacent KQL',
  }
);

export const FILTER_KQL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterKqlTooltip',
  {
    defaultMessage: 'Events from the data providers above are filtered by this KQL',
  }
);

export const FILTER_KQL_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterKqlPlaceholder',
  {
    defaultMessage: 'Filter events',
  }
);

export const FILTER_KQL_SELECTED_TEXT = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterKqlSelectedText',
  {
    defaultMessage: 'Filter',
  }
);

export const SEARCH_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.searchDescription',
  {
    defaultMessage:
      'Events from the data providers above are combined with results from the adjacent KQL',
  }
);

export const SEARCH_KQL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.searchKqlTooltip',
  {
    defaultMessage: 'Events from the data providers above are combined with results from this KQL',
  }
);

export const SEARCH_KQL_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.searchKqlPlaceholder',
  {
    defaultMessage: 'Search events',
  }
);

export const SEARCH_KQL_SELECTED_TEXT = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.searchKqlSelectedText',
  {
    defaultMessage: 'Search',
  }
);

export const FILTER_OR_SEARCH_WITH_KQL = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterOrSearchWithKql',
  {
    defaultMessage: 'Filter or Search with KQL',
  }
);

export const ALL_EVENT = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.eventTypeAllEvent',
  {
    defaultMessage: 'All',
  }
);

export const RAW_EVENT = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.eventTypeRawEvent',
  {
    defaultMessage: 'Raw events',
  }
);

export const DETECTION_ALERTS_EVENT = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.eventTypeDetectionAlertsEvent',
  {
    defaultMessage: 'Detection Alerts',
  }
);
