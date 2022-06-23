/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const POLICY_ARTIFACT_FLYOUT_LABELS = Object.freeze({
  flyoutWarningCalloutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.searchWarning.title',
    {
      defaultMessage: 'Limited search results',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} artifacts are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no artifacts that can be assigned to this policy.',
    }
  ),
  flyoutNoSearchResultsMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.noResults',
    {
      defaultMessage: 'No items found',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.title',
    {
      defaultMessage: 'Assign artifacts',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.subtitle', {
      defaultMessage: 'Select artifacts to add to {policyName}',
      values: { policyName },
    }),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.search.label',
    {
      defaultMessage: 'Search artifacts',
    }
  ),
  flyoutCancelButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.cancel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  flyoutSubmitButtonTitle: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.confirm', {
      defaultMessage: 'Assign to {policyName}',
      values: { policyName },
    }),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.toastError.text',
    {
      defaultMessage: `An error occurred updating artifacts`,
    }
  ),
  flyoutSuccessMessageTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.toastSuccess.title',
    {
      defaultMessage: 'Success',
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} artifacts have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" has been added to your artifacts list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
});
