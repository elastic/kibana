/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const POLICY_ARTIFACT_TRUSTED_APPS_LABELS = Object.freeze({
  deleteModalTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.title',
    {
      defaultMessage: 'Remove trusted application from policy',
    }
  ),
  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This trusted application will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove trusted app',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} trusted applications are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no trusted applications that can be assigned to this policy.',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.title',
    {
      defaultMessage: 'Assign trusted applications',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.subtitle', {
      defaultMessage: 'Select trusted applications to add to {policyName}',
      values: { policyName },
    }),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.layout.search.label',
    {
      defaultMessage: 'Search trusted applications',
    }
  ),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.toastError.text',
    {
      defaultMessage: `An error occurred updating trusted applications`,
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} trusted applications have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" has been added to your trusted application list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.title',
    { defaultMessage: 'No assigned trusted applications' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.content', {
      defaultMessage:
        'There are currently no trusted applications assigned to {policyName}. Assign trusted applications now or add and manage them on the trusted applications page.',
      values: { policyName },
    }),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign trusted applications',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage trusted applications',
    }
  ),
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.title',
    { defaultMessage: 'No trusted applications exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.content',
    { defaultMessage: 'There are currently no trusted applications applied to your endpoints.' }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.action',
    { defaultMessage: 'Add trusted applications' }
  ),
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.trustedApps.list.totalItemCount', {
      defaultMessage:
        'Showing {totalItemsCount, plural, one {# trusted app} other {# trusted applications}}',
      values: { totalItemsCount },
    }),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied trusted application cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.list.search.placeholder',
    {
      defaultMessage: `Search on the fields below: name, description, value`,
    }
  ),
  layoutTitle: i18n.translate('xpack.securitySolution.endpoint.policy.trustedApps.layout.title', {
    defaultMessage: 'Assigned trusted applications',
  }),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.layout.assignToPolicy',
    {
      defaultMessage: 'Assign trusted applications to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedApps.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all trusted applications',
    }
  ),
});
