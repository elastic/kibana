/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

// TODO: It's very likely that we'll move these i18n constants to their respective component
// folders once those are migrated over. This is a temporary way of DRYing them out for now.

export const ANALYTICS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.title',
  { defaultMessage: 'Analytics' }
);
export const DOCUMENTS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.documents.title',
  { defaultMessage: 'Documents' }
);
export const SCHEMA_TITLE = i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.title', {
  defaultMessage: 'Schema',
});
export const CRAWLER_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.crawler.title',
  { defaultMessage: 'Crawler' }
);
export const RELEVANCE_TUNING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.title',
  { defaultMessage: 'Relevance Tuning' }
);
export const SYNONYMS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.title',
  { defaultMessage: 'Synonyms' }
);
export const CURATIONS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.curations.title',
  { defaultMessage: 'Curations' }
);
export const RESULT_SETTINGS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.title',
  { defaultMessage: 'Result Settings' }
);
export const SEARCH_UI_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.title',
  { defaultMessage: 'Search UI' }
);
export const API_LOGS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.apiLogs.title',
  { defaultMessage: 'API Logs' }
);
