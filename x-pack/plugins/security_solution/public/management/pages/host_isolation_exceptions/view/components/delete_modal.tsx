/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useMutation } from 'react-query';
import { useHttp, useToasts } from '../../../../../common/lib/kibana';
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
                  'Unable to remove "{name}" from the Host isolation exceptions list. Reason: {message}',
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
                  '"{name}" has been removed from the Host isolation exceptions list.',
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
              defaultMessage="Delete Host isolation exception"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj="hostIsolationExceptionsFilterDeleteModalBody">
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.subtitle"
                defaultMessage='You are deleting exception "{name}".'
                values={{ name: <b className="eui-textBreakWord">{item?.name}</b> }}
              />
            </p>
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

          <EuiButton
            fill
            color="danger"
            onClick={handleConfirmButton}
            isLoading={mutation.isLoading}
            data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.confirmButton"
              defaultMessage="Remove exception"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

HostIsolationExceptionDeleteModal.displayName = 'HostIsolationExceptionDeleteModal';
