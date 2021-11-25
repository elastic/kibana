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
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { ServerApiError } from '../../../../../common/types';
import { Loader } from '../../../../../common/components/loader';
import { useHttp, useToasts } from '../../../../../common/lib/kibana';
import {
  getCreateErrorMessage,
  getCreationSuccessMessage,
  getLoadErrorMessage,
  getUpdateErrorMessage,
  getUpdateSuccessMessage,
} from './translations';
import { createEmptyHostIsolationException } from '../../utils';
import { HostIsolationExceptionsForm } from './form';
import {
  createHostIsolationExceptionItem,
  getOneHostIsolationExceptionItem,
  updateOneHostIsolationExceptionItem,
} from '../../service';

export const HostIsolationExceptionsFormFlyout = memo(
  ({ onCancel, id }: { onCancel: () => void; id?: string }) => {
    const http = useHttp();
    const toasts = useToasts();
    const queryClient = useQueryClient();

    const isEditing = id !== undefined;
    const [exception, setException] = useState<
      CreateExceptionListItemSchema | UpdateExceptionListItemSchema | undefined
    >(undefined);

    useQuery<UpdateExceptionListItemSchema | CreateExceptionListItemSchema, ServerApiError>(
      ['hostIsolationExceptions', 'form', id],
      async () => {
        // for editing, fetch from the API
        if (id !== undefined) {
          return getOneHostIsolationExceptionItem(http, id);
        }
        // for adding, return a new empty object
        return createEmptyHostIsolationException();
      },
      {
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        onSuccess: (data) => {
          setException(data);
        },
        onError: (error) => {
          toasts.addWarning(getLoadErrorMessage(error));
          onCancel();
        },
      }
    );

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
              defaultMessage="Edit host isolation exception"
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

    return exception ? (
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
            onChange={setException}
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
