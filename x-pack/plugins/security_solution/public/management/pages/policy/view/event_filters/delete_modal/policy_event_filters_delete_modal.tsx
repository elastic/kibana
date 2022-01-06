/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { useCallback } from 'react';
import { useToasts } from '../../../../../../common/lib/kibana';
import { ServerApiError } from '../../../../../../common/types';
import { useBulkUpdateEventFilters } from '../hooks';

export const PolicyEventFiltersDeleteModal = ({
  policyId,
  exception,
  onCancel,
}: {
  policyId: string;
  exception: ExceptionListItemSchema;
  onCancel: () => void;
}) => {
  const toasts = useToasts();

  const { mutate: updateEventFilter, isLoading: isUpdateEventFilterLoading } =
    useBulkUpdateEventFilters({
      onUpdateSuccess: () => {
        toasts.addSuccess({
          title: i18n.translate(
            'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.successToastTitle',
            { defaultMessage: 'Successfully removed' }
          ),
          text: i18n.translate(
            'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.successToastText',
            {
              defaultMessage: '"{exception}" has been removed from policy',
              values: { exception: exception.name },
            }
          ),
        });
        onCancel();
      },
      onUpdateError: (error?: ServerApiError) => {
        toasts.addError(error as unknown as Error, {
          title: i18n.translate(
            'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.errorToastTitle',
            {
              defaultMessage: 'Error while attempt to remove event filter',
            }
          ),
        });
        onCancel();
      },
      onSettledCallback: onCancel,
    });

  const handleModalConfirm = useCallback(() => {
    const modifiedException = {
      ...exception,
      tags: exception.tags.filter((tag) => tag !== `policy:${policyId}`),
    };
    updateEventFilter([modifiedException]);
  }, [exception, policyId, updateEventFilter]);

  const handleCancel = useCallback(() => {
    if (!isUpdateEventFilterLoading) {
      onCancel();
    }
  }, [isUpdateEventFilterLoading, onCancel]);

  return (
    <EuiConfirmModal
      onCancel={handleCancel}
      onConfirm={handleModalConfirm}
      title={i18n.translate(
        'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.title',
        { defaultMessage: 'Remove event filter from policy' }
      )}
      cancelButtonText={i18n.translate(
        'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.cancelLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.confirmLabel',
        {
          defaultMessage: 'Remove from policy',
        }
      )}
      isLoading={isUpdateEventFilterLoading}
      data-test-subj={'remove-from-policy-dialog'}
    >
      <EuiCallOut color="warning" iconType="help">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.messageCallout"
            defaultMessage="This event filter will be removed only from this policy and can still be found and managed from the event filters page."
          />
        </p>
      </EuiCallOut>

      <EuiSpacer />

      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.eventFilters.list.removeDialog.message"
            defaultMessage="Are you sure you wish to continue?"
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
