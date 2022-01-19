/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Loader } from '../../../../../common/components/loader';
import { useHttp, useToasts } from '../../../../../common/lib/kibana';
import { ServerApiError } from '../../../../../common/types';
import { useGetEndpointSpecificPolicies } from '../../../../services/policies/hooks';
import {
  createHostIsolationExceptionItem,
  updateOneHostIsolationExceptionItem,
} from '../../service';
import { useGetHostIsolationExceptionFormEntry } from '../hooks';
import { HostIsolationExceptionsForm } from './form';
import {
  getCreateErrorMessage,
  getCreationSuccessMessage,
  getLoadErrorMessage,
  getUpdateErrorMessage,
  getUpdateSuccessMessage,
} from './translations';

export const HostIsolationExceptionsFormFlyout = memo(
  ({ onCancel, id }: { onCancel: () => void; id?: string }) => {
    const http = useHttp();
    const toasts = useToasts();
    const queryClient = useQueryClient();

    const isEditing = id !== undefined;
    const [exception, setException] = useState<
      CreateExceptionListItemSchema | UpdateExceptionListItemSchema | undefined
    >(undefined);

    // Load the entry to create or edit
    useGetHostIsolationExceptionFormEntry({
      id,
      onSuccess: (data) => setException(data),
      onError: (error) => {
        toasts.addWarning(getLoadErrorMessage(error));
        onCancel();
      },
    });

    // load the list of policies>
    const policiesRequest = useGetEndpointSpecificPolicies({
      onError: (error) => {
        toasts.addWarning(getLoadErrorMessage(error));
        onCancel();
      },
    });

    const mutation = useMutation(
      () => {
        if (isEditing) {
          return updateOneHostIsolationExceptionItem(
            http,
            exception as UpdateExceptionListItemSchema
          );
        } else {
          return createHostIsolationExceptionItem(http, exception as CreateExceptionListItemSchema);
        }
      },
      {
        onSuccess: () => {
          if (exception?.name) {
            if (isEditing) {
              toasts.addSuccess(getUpdateSuccessMessage(exception.name));
            } else {
              toasts.addSuccess(getCreationSuccessMessage(exception.name));
            }
          }
          queryClient.invalidateQueries('hostIsolationExceptions');
          onCancel();
        },
        onError: (error: ServerApiError) => {
          if (isEditing) {
            toasts.addDanger(getUpdateErrorMessage(error));
          } else {
            toasts.addDanger(getCreateErrorMessage(error));
          }
        },
      }
    );

    const [formHasError, setFormHasError] = useState(true);

    const handleOnCancel = useCallback(() => {
      if (mutation.isLoading) return;
      onCancel();
    }, [mutation, onCancel]);

    const handleOnSubmit = useCallback(() => {
      mutation.mutate();
    }, [mutation]);

    const confirmButtonMemo = useMemo(
      () => (
        <EuiButton
          data-test-subj="add-exception-confirm-button"
          fill
          disabled={formHasError || mutation.isLoading}
          onClick={handleOnSubmit}
          isLoading={mutation.isLoading}
        >
          {isEditing ? (
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.flyout.editButton"
              defaultMessage="Save"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.flyout.createButton"
              defaultMessage="Add host isolation exception"
            />
          )}
        </EuiButton>
      ),
      [formHasError, handleOnSubmit, isEditing, mutation.isLoading]
    );

    const handleFormChange = (
      change: Partial<CreateExceptionListItemSchema> | Partial<UpdateExceptionListItemSchema>
    ) => {
      setException(Object.assign(exception, change));
    };

    return exception && policiesRequest.data?.items ? (
      <EuiFlyout
        size="m"
        onClose={handleOnCancel}
        data-test-subj="hostIsolationExceptionsCreateEditFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            {isEditing ? (
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.hostIsolationExceptions.flyout.editTitle"
                  defaultMessage="Edit host isolation exception"
                />
              </h2>
            ) : (
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.hostIsolationExceptions.flyout.title"
                  defaultMessage="Add host isolation exception"
                />
              </h2>
            )}
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <HostIsolationExceptionsForm
            policies={policiesRequest.data?.items}
            onChange={handleFormChange}
            exception={exception}
            onError={setFormHasError}
          />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="add-exception-cancel-button" onClick={handleOnCancel}>
                <FormattedMessage
                  id="xpack.securitySolution.hostIsolationExceptions.flyout.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{confirmButtonMemo}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    ) : (
      <Loader size="xl" />
    );
  }
);

HostIsolationExceptionsFormFlyout.displayName = 'HostIsolationExceptionsFormFlyout';
