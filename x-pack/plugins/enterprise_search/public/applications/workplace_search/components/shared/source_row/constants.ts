/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SOURCE_ROW_REAUTHENTICATE_STATUS_LINK_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sourceRow.reauthenticateStatusLinkLabel',
  {
    defaultMessage: 'Re-authenticate',
  }
);

export const SOURCE_ROW_REMOTE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sourceRow.remoteLabel',
  {
    defaultMessage: 'Remote',
  }
);

export const SOURCE_ROW_REMOTE_TOOLTIP = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sourceRow.remoteTooltip',
  {
    defaultMessage:
      "Remote sources rely on the source's search service directly, and no content is indexed with Workplace Search. Speed and integrity of results are functions of the third-party service's health and performance.",
  }
);

export const SOURCE_ROW_SEARCHABLE_TOGGLE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sourceRow.searchableToggleLabel',
  {
    defaultMessage: 'Source searchable toggle',
  }
);

export const SOURCE_ROW_DETAILS_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sourceRow.detailsLabel',
  {
    defaultMessage: 'Details',
  }
);
