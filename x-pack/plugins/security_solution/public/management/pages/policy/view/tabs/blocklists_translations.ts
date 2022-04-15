/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const POLICY_ARTIFACT_BLOCKLISTS_LABELS = Object.freeze({
  deleteModalTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.list.removeDialog.title',
    {
      defaultMessage: 'Remove blocklist entry from policy',
    }
  ),
  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This blocklist entry will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove blocklist entry',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.blocklist.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} blocklist entries are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no blocklist entries that can be assigned to this policy.',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.layout.flyout.title',
    {
      defaultMessage: 'Assign blocklist entries',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.blocklist.layout.flyout.subtitle', {
      defaultMessage: 'Select blocklist entries to add to {policyName}',
      values: { policyName },
    }),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.layout.search.label',
    {
      defaultMessage: 'Search blocklist entries',
    }
  ),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.layout.flyout.toastError.text',
    {
      defaultMessage: `An error occurred updating blocklist entry`,
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.blocklist.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} blocklist entries have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.blocklist.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" blocklist has been added to your list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.empty.unassigned.title',
    { defaultMessage: 'No assigned blocklist entries' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.blocklist.empty.unassigned.content', {
      defaultMessage:
        'There are currently no blocklist entries assigned to {policyName}. Assign blocklist entries now or add and manage them on the blocklist page.',
      values: { policyName },
    }),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign blocklist entry',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage blocklist entries',
    }
  ),
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.empty.unexisting.title',
    { defaultMessage: 'No blocklists entries exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.empty.unexisting.content',
    {
      defaultMessage: 'There are currently no blocklist entries applied to your endpoints.',
    }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.empty.unexisting.action',
    { defaultMessage: 'Add blocklist entry' }
  ),
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.blocklists.list.totalItemCount', {
      defaultMessage:
        'Showing {totalItemsCount, plural, one {# blocklist entry} other {# blocklist entries}}',
      values: { totalItemsCount },
    }),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied blocklist cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.list.search.placeholder',
    {
      defaultMessage: `Search on the fields below: name, description, value`,
    }
  ),
  layoutTitle: i18n.translate('xpack.securitySolution.endpoint.policy.blocklist.layout.title', {
    defaultMessage: 'Assigned blocklist entries',
  }),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.layout.assignToPolicy',
    {
      defaultMessage: 'Assign blocklist entry to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklist.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all blocklist entries',
    }
  ),
});
