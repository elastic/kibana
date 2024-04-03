/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_CASE_SUCCESS = i18n.translate(
  'xpack.securitySolution.dataQualityDashboard.addToCaseSuccessToast',
  {
    defaultMessage: 'Successfully added data quality results to the case',
  }
);

export const BETA = i18n.translate('xpack.securitySolution.dataQualityDashboard.betaBadge', {
  defaultMessage: 'Beta',
});

export const COLD = i18n.translate('xpack.securitySolution.overview.ilmPhaseCold', {
  defaultMessage: 'cold',
});

export const DATA_QUALITY_TITLE = i18n.translate(
  'xpack.securitySolution.dataQualityDashboard.pageTitle',
  {
    defaultMessage: 'Data Quality',
  }
);

export const DATE_PICKER_TOOLTIP = i18n.translate(
  'xpack.securitySolution.dataQualityDashboard.datePicker.tooltip',
  {
    defaultMessage: `Data quality checks are ran on data that was ingested during the Search Boost window. The default window range is 7 days.`,
  }
);

export const ELASTIC_COMMON_SCHEMA = i18n.translate(
  'xpack.securitySolution.dataQualityDashboard.elasticCommonSchemaReferenceLink',
  {
    defaultMessage: 'Elastic Common Schema (ECS)',
  }
);

export const SECURITY_SOLUTION_DEFAULT_INDEX_TOOLTIP = (settingName: string) =>
  i18n.translate(
    'xpack.securitySolution.dataQualityDashboard.securitySolutionDefaultIndexTooltip',
    {
      values: { settingName },
      defaultMessage: `Indices and patterns from the {settingName} setting`,
    }
  );

export const EVENTS = i18n.translate('xpack.securitySolution.overview.eventsTitle', {
  defaultMessage: 'Event count',
});

export const FROZEN = i18n.translate('xpack.securitySolution.overview.ilmPhaseFrozen', {
  defaultMessage: 'frozen',
});

export const HOT = i18n.translate('xpack.securitySolution.overview.ilmPhaseHot', {
  defaultMessage: 'hot',
});

export const NEWS_FEED_TITLE = i18n.translate(
  'xpack.securitySolution.overview.newsFeedSidebarTitle',
  {
    defaultMessage: 'Security news',
  }
);

export const RECENT_TIMELINES = i18n.translate(
  'xpack.securitySolution.overview.recentTimelinesSidebarTitle',
  {
    defaultMessage: 'Recent timelines',
  }
);

export const ALERT_TREND = i18n.translate('xpack.securitySolution.overview.signalCountTitle', {
  defaultMessage: 'Alert trend',
});

export const TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.overview.topNLabel', {
    values: { fieldName },
    defaultMessage: `Top {fieldName}`,
  });

export const UNMANAGED = i18n.translate('xpack.securitySolution.overview.ilmPhaseUnmanaged', {
  defaultMessage: 'unmanaged',
});

export const VIEW_ALERTS = i18n.translate('xpack.securitySolution.overview.viewAlertsButtonLabel', {
  defaultMessage: 'View alerts',
});

export const VIEW_EVENTS = i18n.translate('xpack.securitySolution.overview.viewEventsButtonLabel', {
  defaultMessage: 'View events',
});

export const WARM = i18n.translate('xpack.securitySolution.overview.ilmPhaseWarm', {
  defaultMessage: 'warm',
});

export const DETECTION_RESPONSE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.pageTitle',
  {
    defaultMessage: 'Detection & Response',
  }
);

export const TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.entityAnalytics.technicalPreviewLabel',
  {
    defaultMessage: 'Technical Preview',
  }
);
