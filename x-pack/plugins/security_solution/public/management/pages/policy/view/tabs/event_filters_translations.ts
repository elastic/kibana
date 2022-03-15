/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const POLICY_ARTIFACT_EVENT_FILTERS_LABELS = Object.freeze({
  deleteModalTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.title',
    {
      defaultMessage: 'Remove event filter from policy',
    }
  ),
  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This event filter will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove event filter',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.eventFilters.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} event filters are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no event filters that can be assigned to this policy.',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.layout.flyout.title',
    {
      defaultMessage: 'Assign event filters',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.eventFilters.layout.flyout.subtitle', {
      defaultMessage: 'Select event filters to add to {policyName}',
      values: { policyName },
    }),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.layout.search.label',
    {
      defaultMessage: 'Search event filters',
    }
  ),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.layout.flyout.toastError.text',
    {
      defaultMessage: `An error occurred updating event filters`,
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.eventFilters.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} event filters have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.eventFilters.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" has been added to your event filter list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.title',
    { defaultMessage: 'No assigned event filters' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.content', {
      defaultMessage:
        'There are currently no event filters assigned to {policyName}. Assign event filters now or add and manage them on the event filters page.',
      values: { policyName },
    }),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign event filters',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage event filters',
    }
  ),
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.empty.unexisting.title',
    { defaultMessage: 'No event filters exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.empty.unexisting.content',
    { defaultMessage: 'There are currently no event filters applied to your endpoints.' }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.empty.unexisting.action',
    { defaultMessage: 'Add event filters' }
  ),
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.eventFilters.list.totalItemCount', {
      defaultMessage:
        'Showing {totalItemsCount, plural, one {# event filter} other {# event filters}}',
      values: { totalItemsCount },
    }),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied event filter cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.list.search.placeholder',
    {
      defaultMessage: `Search on the fields below: name, description, comments, value`,
    }
  ),
  layoutTitle: i18n.translate('xpack.securitySolution.endpoint.policy.eventFilters.layout.title', {
    defaultMessage: 'Assigned event filters',
  }),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.layout.assignToPolicy',
    {
      defaultMessage: 'Assign event filters to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventFilters.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all event filters',
    }
  ),
});
