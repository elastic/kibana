/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const POLICY_ARTIFACT_DELETE_MODAL_LABELS = Object.freeze({
  deleteModalTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.title',
    {
      defaultMessage: 'Remove artifact from policy',
    }
  ),

  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This artifact will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),

  deleteModalConfirmInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.message',
    {
      defaultMessage: 'Are you sure you wish to continue?',
    }
  ),

  deleteModalSubmitButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.confirmLabel',
    {
      defaultMessage: 'Remove from policy',
    }
  ),

  deleteModalCancelButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.cancelLabel',
    { defaultMessage: 'Cancel' }
  ),

  deleteModalSuccessMessageTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.successToastTitle',
    { defaultMessage: 'Successfully removed' }
  ),
  deleteModalSuccessMessageText: (exception: ExceptionListItemSchema, policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.successToastText',
      {
        defaultMessage: '"{artifactName}" has been removed from {policyName} policy',
        values: { artifactName: exception.name, policyName },
      }
    ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove artifact',
    }
  ),
});
