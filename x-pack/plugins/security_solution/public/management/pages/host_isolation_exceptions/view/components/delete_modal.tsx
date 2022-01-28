/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { memo } from 'react';
import { useMutation } from 'react-query';
import { AutoFocusButton } from '../../../../../common/components/autofocus_button/autofocus_button';
import { useHttp, useToasts } from '../../../../../common/lib/kibana';
import {
  getArtifactPoliciesIdByTag,
  isGlobalPolicyEffected,
} from '../../../../components/effected_policy_select/utils';
import { deleteOneHostIsolationExceptionItem } from '../../service';

export const HostIsolationExceptionDeleteModal = memo(
  ({
    item,
    onCancel,
  }: {
    item: ExceptionListItemSchema;
    onCancel: (forceRefresh?: boolean) => void;
  }) => {
    const toasts = useToasts();
    const http = useHttp();

    const mutation = useMutation(
      () => {
        return deleteOneHostIsolationExceptionItem(http, item.id);
      },
      {
        onError: (error: Error) => {
          toasts.addDanger(
            i18n.translate(
              'xpack.securitySolution.hostIsolationExceptions.deletionDialog.deleteFailure',
              {
                defaultMessage:
                  'Unable to remove "{name}" from the host isolation exceptions list. Reason: {message}',
                values: { name: item?.name, message: error.message },
              }
            )
          );
          onCancel(true);
        },
        onSuccess: () => {
          toasts.addSuccess(
            i18n.translate(
              'xpack.securitySolution.hostIsolationExceptions.deletionDialog.deleteSuccess',
              {
                defaultMessage:
                  '"{name}" has been removed from the host isolation exceptions list.',
                values: { name: item?.name },
              }
            )
          );
          onCancel(true);
        },
      }
    );

    const handleConfirmButton = () => {
      mutation.mutate();
    };

    const handleCancelButton = () => {
      onCancel();
    };

    return (
      <EuiModal onClose={() => onCancel()}>
        <EuiModalHeader data-test-subj="hostIsolationExceptionsDeleteModalHeader">
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.title"
              defaultMessage="Delete host isolation exception"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj="hostIsolationExceptionsFilterDeleteModalBody">
          <EuiText>
            <EuiCallOut
              data-test-subj="hostIsolationExceptionsDeleteModalCallout"
              title={i18n.translate(
                'xpack.securitySolution.hostIsolationExceptions.deletionDialog.calloutTitle',
                {
                  defaultMessage: 'Warning',
                }
              )}
              color="danger"
              iconType="alert"
            >
              <p data-test-subj="hostIsolationExceptionsDeleteModalCalloutMessage">
                <FormattedMessage
                  id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.calloutMessage"
                  defaultMessage="Deleting this entry will remove it from {count} associated {count, plural, one {policy} other {policies}}."
                  values={{
                    count: isGlobalPolicyEffected(Array.from(item.tags || []))
                      ? 'all'
                      : getArtifactPoliciesIdByTag(item.tags).length,
                  }}
                />
              </p>
            </EuiCallOut>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.confirmation"
                defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
              />
            </p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={handleCancelButton}
            isDisabled={mutation.isLoading}
            data-test-subj="hostIsolationExceptionsDeleteModalCancelButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.cancel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <AutoFocusButton
            fill
            color="danger"
            onClick={handleConfirmButton}
            isLoading={mutation.isLoading}
            data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.confirmButton"
              defaultMessage="Delete"
            />
          </AutoFocusButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

HostIsolationExceptionDeleteModal.displayName = 'HostIsolationExceptionDeleteModal';
