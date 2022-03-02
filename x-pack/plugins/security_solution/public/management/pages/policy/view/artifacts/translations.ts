/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { POLICY_ARTIFACT_DELETE_MODAL_LABELS } from './delete_modal';
import {
  POLICY_ARTIFACT_EMPTY_UNASSIGNED_LABELS,
  POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS,
} from './empty';
import { POLICY_ARTIFACT_FLYOUT_LABELS } from './flyout';
import { POLICY_ARTIFACT_LAYOUT_LABELS } from './layout';
import { POLICY_ARTIFACT_LIST_LABELS } from './list';

export const policyArtifactsPageLabels = Object.freeze({
  // ------------------------------
  // POLICY ARTIFACT LAYOUT
  // ------------------------------
  ...POLICY_ARTIFACT_LAYOUT_LABELS,

  // ------------------------------
  // POLICY ARTIFACT DELETE MODAL
  // ------------------------------
  ...POLICY_ARTIFACT_DELETE_MODAL_LABELS,

  // ------------------------------
  // POLICY ARTIFACT FLYOUT
  // ------------------------------
  ...POLICY_ARTIFACT_FLYOUT_LABELS,

  // ------------------------------
  // POLICY ARTIFACT EMPTY UNASSIGNED
  // ------------------------------
  ...POLICY_ARTIFACT_EMPTY_UNASSIGNED_LABELS,

  // ------------------------------
  // POLICY ARTIFACT EMPTY UNEXISTING
  // ------------------------------
  ...POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS,

  // ------------------------------
  // POLICY ARTIFACT LIST
  // ------------------------------
  ...POLICY_ARTIFACT_LIST_LABELS,
});

type IAllLabels = typeof policyArtifactsPageLabels;

/**
 * The set of labels that normally have the policy artifact specific name in it, thus must be set for every page
 */
export type PolicyArtifactsPageRequiredLabels = Pick<
  IAllLabels,
  | 'deleteModalTitle'
  | 'deleteModalImpactInfo'
  | 'deleteModalErrorMessage'
  | 'flyoutWarningCalloutMessage'
  | 'flyoutNoArtifactsToBeAssignedMessage'
  | 'flyoutTitle'
  | 'flyoutSubtitle'
  | 'flyoutSearchPlaceholder'
  | 'flyoutErrorMessage'
  | 'flyoutSuccessMessageText'
  | 'emptyUnassignedTitle'
  | 'emptyUnassignedMessage'
  | 'emptyUnassignedPrimaryActionButtonTitle'
  | 'emptyUnassignedSecondaryActionButtonTitle'
  | 'emptyUnexistingTitle'
  | 'emptyUnexistingMessage'
  | 'emptyUnexistingPrimaryActionButtonTitle'
  | 'listTotalItemCountMessage'
  | 'listRemoveActionNotAllowedMessage'
  | 'listSearchPlaceholderMessage'
  | 'layoutTitle'
  | 'layoutAssignButtonTitle'
  | 'layoutViewAllLinkMessage'
  | 'layoutAboutMessage'
>;

export type PolicyArtifactPageOptionalLabels = Omit<
  IAllLabels,
  keyof PolicyArtifactsPageRequiredLabels
>;

export type PolicyArtifactsPageLabels = PolicyArtifactsPageRequiredLabels &
  Partial<PolicyArtifactPageOptionalLabels>;
