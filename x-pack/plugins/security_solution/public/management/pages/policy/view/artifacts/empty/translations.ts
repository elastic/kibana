/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POLICY_ARTIFACT_EMPTY_UNASSIGNED_LABELS = Object.freeze({
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.title',
    { defaultMessage: 'No assigned artifacts' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.content', {
      defaultMessage:
        'There are currently no artifacts assigned to {policyName}. Assign artifacts now or add and manage them on the artifacts page.',
      values: { policyName },
    }),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign artifacts',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage artifacts',
    }
  ),
});

export const POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS = Object.freeze({
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.empty.unexisting.title',
    { defaultMessage: 'No artifacts exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.empty.unexisting.content',
    { defaultMessage: 'There are currently no artifacts applied to your endpoints.' }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.empty.unexisting.action',
    { defaultMessage: 'Add artifacts' }
  ),
});
