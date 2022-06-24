/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const POLICY_ARTIFACT_HOST_ISOLATION_EXCEPTIONS_LABELS = Object.freeze({
  deleteModalTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.list.removeDialog.title',
    {
      defaultMessage: 'Remove host isolation exception from policy',
    }
  ),
  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This host isolation exception will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove host isolation exception',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} host isolation exceptions are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no host isolation exceptions that can be assigned to this policy.',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.flyout.title',
    {
      defaultMessage: 'Assign host isolation exceptions',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.flyout.subtitle',
      {
        defaultMessage: 'Select host isolation exceptions to add to {policyName}',
        values: { policyName },
      }
    ),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.search.label',
    {
      defaultMessage: 'Search host isolation exceptions',
    }
  ),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.flyout.toastError.text',
    {
      defaultMessage: `An error occurred updating host isolation exceptions`,
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} host isolation exceptions have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" has been added to your host isolation exception list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.empty.unassigned.title',
    { defaultMessage: 'No assigned host isolation exceptions' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.hostIsolationException.empty.unassigned.content',
      {
        defaultMessage:
          'There are currently no host isolation exceptions assigned to {policyName}. Assign host isolation exceptions now or add and manage them on the host isolation exceptions page.',
        values: { policyName },
      }
    ),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign host isolation exceptions',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage host isolation exceptions',
    }
  ),
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.empty.unexisting.title',
    { defaultMessage: 'No host isolation exceptions exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.empty.unexisting.content',
    {
      defaultMessage: 'There are currently no host isolation exceptions applied to your endpoints.',
    }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.empty.unexisting.action',
    { defaultMessage: 'Add host isolation exceptions' }
  ),
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.hostIsolationException.list.totalItemCount',
      {
        defaultMessage:
          'Showing {totalItemsCount, plural, one {# host isolation exception} other {# host isolation exceptions}}',
        values: { totalItemsCount },
      }
    ),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied host isolation exception cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.list.search.placeholder',
    {
      defaultMessage: `Search on the fields below: name, description, IP`,
    }
  ),
  layoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.title',
    {
      defaultMessage: 'Assigned host isolation exceptions',
    }
  ),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.assignToPolicy',
    {
      defaultMessage: 'Assign host isolation exceptions to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.hostIsolationException.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all host isolation exceptions',
    }
  ),
});
