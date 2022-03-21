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
    'xpack.securitySolution.endpoint.policy.blocklists.list.removeDialog.title',
    {
      defaultMessage: 'Remove blocklist from policy',
    }
  ),
  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This blocklist will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove blocklist',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.blocklists.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} blocklists are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no blocklists that can be assigned to this policy.',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.layout.flyout.title',
    {
      defaultMessage: 'Assign blocklists',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.blocklists.layout.flyout.subtitle', {
      defaultMessage: 'Select blocklists to add to {policyName}',
      values: { policyName },
    }),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.layout.search.label',
    {
      defaultMessage: 'Search blocklists',
    }
  ),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.layout.flyout.toastError.text',
    {
      defaultMessage: `An error occurred updating blocklists`,
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.blocklists.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} blocklists have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.blocklists.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" has been added to your blocklist list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.empty.unassigned.title',
    { defaultMessage: 'No assigned blocklists' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.blocklists.empty.unassigned.content', {
      defaultMessage:
        'There are currently no blocklists assigned to {policyName}. Assign blocklists now or add and manage them on the blocklists page.',
      values: { policyName },
    }),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign blocklists',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage blocklists',
    }
  ),
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.empty.unexisting.title',
    { defaultMessage: 'No blocklists exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.empty.unexisting.content',
    {
      defaultMessage: 'There are currently no blocklists applied to your endpoints.',
    }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.empty.unexisting.action',
    { defaultMessage: 'Add blocklists' }
  ),
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.blocklists.list.totalItemCount', {
      defaultMessage: 'Showing {totalItemsCount, plural, one {# blocklist} other {# blocklists}}',
      values: { totalItemsCount },
    }),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied blocklist cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.list.search.placeholder',
    {
      defaultMessage: `Search on the fields below: name, description, IP`,
    }
  ),
  layoutTitle: i18n.translate('xpack.securitySolution.endpoint.policy.blocklists.layout.title', {
    defaultMessage: 'Assigned blocklists',
  }),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.layout.assignToPolicy',
    {
      defaultMessage: 'Assign blocklists to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.blocklists.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all blocklists',
    }
  ),
});
