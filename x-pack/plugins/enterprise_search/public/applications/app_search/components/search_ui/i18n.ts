/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { CREDENTIALS_TITLE } from '../credentials';

export const SEARCH_UI_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.title',
  { defaultMessage: 'Search UI' }
);

export const TITLE_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.titleFieldLabel',
  { defaultMessage: 'Title field (Optional)' }
);
export const TITLE_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.titleFieldHelpText',
  { defaultMessage: 'Used as the top-level visual identifier for every rendered result' }
);
export const FILTER_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.filterFieldLabel',
  { defaultMessage: 'Filter fields (Optional)' }
);
export const FILTER_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.filterFieldHelpText',
  { defaultMessage: 'Faceted values rendered as filters and available as query refinement' }
);
export const SORT_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.sortFieldLabel',
  { defaultMessage: 'Sort fields (Optional)' }
);
export const SORT_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.sortHelpText',
  { defaultMessage: 'Used to display result sorting options, ascending and descending' }
);
export const URL_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.urlFieldLabel',
  { defaultMessage: 'URL field (Optional)' }
);
export const THUMBNAIL_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.thumbnailFieldLabel',
  { defaultMessage: 'Thumbnail field (Optional)' }
);
export const URL_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.urlFieldHelpText',
  { defaultMessage: "Used as a result's link target, if applicable" }
);
export const THUMBNAIL_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.thumbnailFieldHelpText',
  { defaultMessage: 'Provide an image URL to show a thumbnail image' }
);
export const GENERATE_PREVIEW_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.generatePreviewButtonLabel',
  { defaultMessage: 'Generate search experience' }
);
export const NO_SEARCH_KEY_ERROR = (engineName: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.engine.searchUI.noSearchKeyErrorMessage', {
    defaultMessage:
      "It looks like you don't have any Public Search Keys with access to the ''{engineName}'' engine. Please visit the {credentialsTitle} page to set one up.",
    values: { engineName, credentialsTitle: CREDENTIALS_TITLE },
  });
