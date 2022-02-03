/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const artifactListPageLabels = Object.freeze({
  pageTitle: i18n.translate('xpack.securitySolution.artifactListPage.pageTitle', {
    defaultMessage: 'Artifact',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.aboutInfo', {
    defaultMessage: 'A list of artifacts for endpoint',
  }),
  pageAddButtonTitle: i18n.translate('xpack.securitySolution.addButtonTitle', {
    defaultMessage: 'Add artifact',
  }),

  emptyStateTitle: i18n.translate('xpack.securitySolution.emptyStateTitle', {
    defaultMessage: 'Add your first artifact',
  }),
  emptyStateInfo: i18n.translate('xpack.securitySolution.emptyStateInfo', {
    defaultMessage: 'Add an artifact',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Add' }
  ),

  searchPlaceholderInfo: i18n.translate('xpack.securitySolution.searchPlaceholderInfo', {
    defaultMessage: 'Search on the fields below: name, description, comments, value',
  }),
  getShowingCountLabel: (total: number) => {
    return i18n.translate('xpack.securitySolution.showingTotal', {
      defaultMessage: 'Showing {total, plural, one {# artifact} other {# artifacts}}',
      values: { total },
    });
  },

  cardActionEditLabel: i18n.translate('xpack.securitySolution.cardActionEditLabel', {
    defaultMessage: 'Edit artifact',
  }),
  cardActionDeleteLabel: i18n.translate('xpack.securitySolution.cardActionDeleteLabel', {
    defaultMessage: 'Delete event filter',
  }),
});
