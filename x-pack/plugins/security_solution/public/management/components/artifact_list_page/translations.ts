/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ARTIFACT_FLYOUT_LABELS } from './components/artifact_flyout';
import { ARTIFACT_DELETE_LABELS } from './components/artifact_delete_modal';
import { ARTIFACT_DELETE_ACTION_LABELS } from './hooks/use_with_artifact_delete_item';

export const artifactListPageLabels = Object.freeze({
  // ------------------------------
  // PAGE labels
  // ------------------------------
  pageTitle: i18n.translate('xpack.securitySolution.artifactListPage.pageTitle', {
    defaultMessage: 'Artifact',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.artifactListPage.aboutInfo', {
    defaultMessage: 'A list of artifacts for endpoint',
  }),
  pageAddButtonTitle: i18n.translate('xpack.securitySolution.artifactListPage.addButtonTitle', {
    defaultMessage: 'Add artifact',
  }),

  // ------------------------------
  // EMPTY state labels
  // ------------------------------
  emptyStateTitle: i18n.translate('xpack.securitySolution.artifactListPage.emptyStateTitle', {
    defaultMessage: 'Add your first artifact',
  }),
  emptyStateInfo: i18n.translate('xpack.securitySolution.artifactListPage.emptyStateInfo', {
    defaultMessage: 'Add an artifact',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Add' }
  ),

  // ------------------------------
  // SEARCH BAR labels
  // ------------------------------
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.artifactListPage.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, comments, value',
    }
  ),
  /**
   * Return the label to show under the search bar with the total number of items that match the current filter (or all)
   * @param total
   *
   * @example:
   *  (total) => i18n.translate('xpack.securitySolution.somepage.showingTotal', {
   *    defaultMessage: 'Showing {total} {total, plural, one {event filter} other {event filters}}',
   *    values: { total },
   *  })
   */
  getShowingCountLabel: (total: number): string => {
    return i18n.translate('xpack.securitySolution.artifactListPage.showingTotal', {
      defaultMessage: 'Showing {total, plural, one {# artifact} other {# artifacts}}',
      values: { total },
    });
  },

  // ------------------------------
  // CARD ACTIONS labels
  // ------------------------------
  cardActionEditLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.cardActionEditLabel',
    {
      defaultMessage: 'Edit artifact',
    }
  ),
  cardActionDeleteLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.cardActionDeleteLabel',
    {
      defaultMessage: 'Delete event filter',
    }
  ),

  // ------------------------------
  // ARTIFACT FLYOUT
  // ------------------------------
  ...ARTIFACT_FLYOUT_LABELS,

  // ------------------------------
  // ARTIFACT DELETE MODAL
  // ------------------------------
  ...ARTIFACT_DELETE_LABELS,
  ...ARTIFACT_DELETE_ACTION_LABELS,
});

type IAllLabels = typeof artifactListPageLabels;

/**
 * The set of labels that normally have the artifact specific name in it, thus must be set for every page
 */
export type ArtifactListPageRequiredLabels = Pick<
  IAllLabels,
  | 'pageTitle'
  | 'pageAboutInfo'
  | 'pageAddButtonTitle'
  | 'getShowingCountLabel'
  | 'cardActionEditLabel'
  | 'cardActionDeleteLabel'
  | 'flyoutCreateTitle'
  | 'flyoutEditTitle'
  | 'flyoutCreateSubmitButtonLabel'
  | 'flyoutCreateSubmitSuccess'
  | 'flyoutEditSubmitSuccess'
  | 'flyoutDowngradedLicenseDocsInfo'
  | 'deleteActionSuccess'
  | 'emptyStateTitle'
  | 'emptyStateInfo'
  | 'emptyStatePrimaryButtonLabel'
>;

export type ArtifactListPageOptionalLabels = Omit<IAllLabels, keyof ArtifactListPageRequiredLabels>;

export type ArtifactListPageLabels = ArtifactListPageRequiredLabels &
  Partial<ArtifactListPageOptionalLabels>;
