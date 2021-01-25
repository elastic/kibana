/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

export const ANALYTICS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.title',
  { defaultMessage: 'Analytics' }
);

// Total card titles
export const TOTAL_DOCUMENTS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.totalDocuments',
  { defaultMessage: 'Total documents' }
);
export const TOTAL_API_OPERATIONS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.totalApiOperations',
  { defaultMessage: 'Total API operations' }
);
export const TOTAL_QUERIES = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.totalQueries',
  { defaultMessage: 'Total queries' }
);
export const TOTAL_CLICKS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.totalClicks',
  { defaultMessage: 'Total clicks' }
);

// Queries sub-pages
export const TOP_QUERIES = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.topQueriesTitle',
  { defaultMessage: 'Top queries' }
);
export const TOP_QUERIES_NO_RESULTS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.topQueriesNoResultsTitle',
  { defaultMessage: 'Top queries with no results' }
);
export const TOP_QUERIES_NO_CLICKS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.topQueriesNoClicksTitle',
  { defaultMessage: 'Top queries with no clicks' }
);
export const TOP_QUERIES_WITH_CLICKS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.topQueriesWithClicksTitle',
  { defaultMessage: 'Top queries with clicks' }
);
export const RECENT_QUERIES = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.recentQueriesTitle',
  { defaultMessage: 'Recent queries' }
);

// Date formats & dates
export const SERVER_DATE_FORMAT = 'YYYY-MM-DD';
export const TOOLTIP_DATE_FORMAT = 'MMMM D, YYYY';
export const X_AXIS_DATE_FORMAT = 'M/D';

export const DEFAULT_START_DATE = moment().subtract(6, 'days').format(SERVER_DATE_FORMAT);
export const DEFAULT_END_DATE = moment().format(SERVER_DATE_FORMAT);
