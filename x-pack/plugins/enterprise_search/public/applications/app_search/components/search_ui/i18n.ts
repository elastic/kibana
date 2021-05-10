/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_UI_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.title',
  { defaultMessage: 'Search UI' }
);

export const SEARCH_UI_BODY_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.bodyDescription',
  {
    defaultMessage:
      "Search UI is an open source library for building search experiences, written in React. Use the fields below to generate a pre-built search experience created with Search UI. Generate an interactive preview, then download the .zip and build upon it however you'd like.",
  }
);

export const REPOSITORY_LINK_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.repositoryLinkText',
  { defaultMessage: 'Read more about Search UI' }
);

export const GUIDE_LINK_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.guideLinkText',
  { defaultMessage: 'Read the guide to using this generator' }
);

export const TITLE_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.titleFieldLabel',
  { defaultMessage: 'Title field (Optional)' }
);
export const TITLE_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.titleFieldHelpText',
  { defaultMessage: 'Used as the top-level visual identifier for every rendered result' }
);
export const TITLE_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.titleFieldPlaceholder',
  { defaultMessage: 'Select a title field' }
);
export const FILTER_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.filterFieldLabel',
  { defaultMessage: 'Filter fields (Optional)' }
);
export const FILTER_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.filterFieldHelpText',
  { defaultMessage: 'Faceted values rendered as filters and available as query refinement' }
);
export const FILTER_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.filterFieldPlaceholder',
  { defaultMessage: 'Click to select' }
);
export const SORT_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.sortFieldLabel',
  { defaultMessage: 'Sort fields (Optional)' }
);
export const SORT_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.sortHelpText',
  { defaultMessage: 'Used to display result sorting options, ascending and descending' }
);
export const SORT_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.sortFieldPlaceholder',
  { defaultMessage: 'Click to select' }
);
export const URL_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.urlFieldLabel',
  { defaultMessage: 'URL field (Optional)' }
);
export const URL_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.urlFieldHelpText',
  { defaultMessage: "Used as a result's link target, if applicable" }
);
export const URL_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.urlFieldPlaceholder',
  { defaultMessage: 'Select a URL field' }
);
export const GENERATE_PREVIEW_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.generatePreviewButtonLabel',
  { defaultMessage: 'Generate preview' }
);
