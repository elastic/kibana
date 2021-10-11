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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { Loader } from '../../../../../common/components/loader';
import { useToasts } from '../../../../../common/lib/kibana';
import {
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
} from '../../../../state/async_resource_state';
import { HostIsolationExceptionsPageAction } from '../../store/action';
import { getCurrentLocation, getExceptionToEdit } from '../../store/selector';
import { createEmptyHostIsolationException } from '../../utils';
import {
  useHostIsolationExceptionsNavigateCallback,
  useHostIsolationExceptionsSelector,
} from '../hooks';
import { HostIsolationExceptionsForm } from './form';
import {
  HOST_ISOLATION_EXCEPTION_CREATION_ERROR,
  HOST_ISOLATION_EXCEPTION_EDIT_ERROR,
} from './translations';

export const HostIsolationExceptionsFormFlyout: React.FC<{}> = memo(() => {
  const dispatch = useDispatch<Dispatch<HostIsolationExceptionsPageAction>>();
  const toasts = useToasts();

  const location = useHostIsolationExceptionsSelector(getCurrentLocation);

  const creationInProgress = useHostIsolationExceptionsSelector((state) =>
    isLoadingResourceState(state.form.status)
  );
  const creationSuccessful = useHostIsolationExceptionsSelector((state) =>
    isLoadedResourceState(state.form.status)
  );
  const creationFailure = useHostIsolationExceptionsSelector((state) =>
    isFailedResourceState(state.form.status)
  );

  const exceptionToEdit = useHostIsolationExceptionsSelector(getExceptionToEdit);

  const navigateCallback = useHostIsolationExceptionsNavigateCallback();

  const [formHasError, setFormHasError] = useState(true);
  const [exception, setException] = useState<
    CreateExceptionListItemSchema | UpdateExceptionListItemSchema | undefined
  >(undefined);

  const onCancel = useCallback(
    () =>
      navigateCallback({
        show: undefined,
        id: undefined,
      }),
    [navigateCallback]
  );

  useEffect(() => {
    if (location.show === 'edit') {
      // prevent flyout to show edit without an id
      if (!location.id) {
        onCancel();
        return;
      }
      // load the exception to edit
      if (!exceptionToEdit || location.id !== exceptionToEdit.id) {
        dispatch({
          type: 'hostIsolationExceptionsMarkToEdit',
          payload: { id: location.id! },
        });
      } else {
        setException(exceptionToEdit);
      }
    }
    // initialize an empty exception to create
  }, [dispatch, exceptionToEdit, location.id, location.show, onCancel]);

  useEffect(() => {
    if (location.show === 'create' && exception === undefined) {
      setException(createEmptyHostIsolationException());
    }
  }, [exception, location.show]);

  useEffect(() => {
    if (creationSuccessful) {
      onCancel();
      dispatch({
        type: 'hostIsolationExceptionsFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
      if (exception?.item_id) {
        toasts.addSuccess(
          i18n.translate(
            'xpack.securitySolution.hostIsolationExceptions.form.editingSuccessToastTitle',
            {
              defaultMessage: '"{name}" has been updated.',
              values: { name: exception?.name },
            }
          )
        );
      } else {
        toasts.addSuccess(
          i18n.translate(
            'xpack.securitySolution.hostIsolationExceptions.form.creationSuccessToastTitle',
            {
              defaultMessage: '"{name}" has been added to the host isolation exceptions list.',
              values: { name: exception?.name },
            }
          )
        );
      }
    }
  }, [creationSuccessful, onCancel, dispatch, toasts, exception?.name, exception?.item_id]);

  useEffect(() => {
    if (creationFailure) {
      if (exception?.item_id) {
        toasts.addDanger(HOST_ISOLATION_EXCEPTION_EDIT_ERROR);
      } else {
        toasts.addDanger(HOST_ISOLATION_EXCEPTION_CREATION_ERROR);
      }
      dispatch({
        type: 'hostIsolationExceptionsFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
    }
  }, [dispatch, toasts, creationFailure, exception?.item_id]);

  const handleOnCancel = useCallback(() => {
    if (creationInProgress) return;
    onCancel();
  }, [creationInProgress, onCancel]);

  const handleOnSubmit = useCallback(() => {
    if (exception?.item_id) {
      dispatch({
        type: 'hostIsolationExceptionsSubmitEdit',
        payload: exception,
      });
    } else {
      dispatch({
        type: 'hostIsolationExceptionsCreateEntry',
        payload: exception,
      });
    }
  }, [dispatch, exception]);

  const confirmButtonMemo = useMemo(
    () => (
      <EuiButton
        data-test-subj="add-exception-confirm-button"
        fill
        disabled={formHasError || creationInProgress}
        onClick={handleOnSubmit}
        isLoading={creationInProgress}
      >
        {exception?.item_id ? (
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.flyout.editButton"
            defaultMessage="Edit Host Isolation Exception"
          />
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.flyout.createButton"
            defaultMessage="Add Host Isolation Exception"
          />
        )}
      </EuiButton>
    ),
    [formHasError, creationInProgress, handleOnSubmit, exception?.item_id]
  );

  return exception ? (
    <EuiFlyout
      size="m"
      onClose={handleOnCancel}
      data-test-subj="hostIsolationExceptionsCreateEditFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          {exception?.item_id ? (
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.hostIsolationExceptions.flyout.editTitle"
                defaultMessage="Edit Host Isolation Exception"
              />
            </h2>
          ) : (
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.hostIsolationExceptions.flyout.title"
                defaultMessage="Add Host Isolation Exception"
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
});

HostIsolationExceptionsFormFlyout.displayName = 'HostIsolationExceptionsFormFlyout';
