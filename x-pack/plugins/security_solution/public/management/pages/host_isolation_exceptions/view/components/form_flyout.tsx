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
import { FormattedMessage } from '@kbn/i18n/react';
import {
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { omit } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Dispatch } from 'redux';
import { Loader } from '../../../../../common/components/loader';
import { useToasts } from '../../../../../common/lib/kibana';
import { getHostIsolationExceptionsListPath } from '../../../../common/routing';
import {
  isLoadedResourceState,
  isLoadingResourceState,
} from '../../../../state/async_resource_state';
import {
  getCreateErrorMessage,
  getCreationSuccessMessage,
  getLoadErrorMessage,
  getUpdateErrorMessage,
  getUpdateSuccessMessage,
} from './translations';
import { HostIsolationExceptionsPageAction } from '../../store/action';
import { getCurrentLocation, getExceptionToEdit, getFormStatusFailure } from '../../store/selector';
import { createEmptyHostIsolationException } from '../../utils';
import {
  useHostIsolationExceptionsNavigateCallback,
  useHostIsolationExceptionsSelector,
} from '../hooks';
import { HostIsolationExceptionsForm } from './form';

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
  const creationFailure = useHostIsolationExceptionsSelector(getFormStatusFailure);
  const exceptionToEdit = useHostIsolationExceptionsSelector(getExceptionToEdit);
  const navigateCallback = useHostIsolationExceptionsNavigateCallback();
  const history = useHistory();

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

  // load data to edit or create
  useEffect(() => {
    if (location.show === 'create' && exception === undefined) {
      setException(createEmptyHostIsolationException());
    } else if (location.show === 'edit') {
      // prevent flyout to show edit without an id
      if (!location.id) {
        onCancel();
        return;
      }
      // load the exception to edit
      if (!exceptionToEdit || location.id !== exceptionToEdit.id) {
        dispatch({
          type: 'hostIsolationExceptionsMarkToEdit',
          payload: { id: location.id },
        });
      } else if (exception === undefined) {
        setException(exceptionToEdit);
      }
    }
  }, [dispatch, exception, exceptionToEdit, location.id, location.show, onCancel]);

  // handle creation and edit success
  useEffect(() => {
    if (creationSuccessful && exception?.name) {
      onCancel();
      dispatch({
        type: 'hostIsolationExceptionsFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
      if (exception?.item_id) {
        toasts.addSuccess(getUpdateSuccessMessage(exception.name));
      } else {
        toasts.addSuccess(getCreationSuccessMessage(exception.name));
      }
    }
  }, [creationSuccessful, dispatch, exception?.item_id, exception?.name, onCancel, toasts]);

  // handle load item to edit error
  useEffect(() => {
    if (creationFailure && location.show === 'edit' && !exception?.item_id) {
      toasts.addWarning(getLoadErrorMessage(creationFailure));
      history.replace(getHostIsolationExceptionsListPath(omit(location, ['show', 'id'])));
      dispatch({
        type: 'hostIsolationExceptionsFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
    }
  }, [creationFailure, dispatch, exception?.item_id, history, location, toasts]);

  // handle edit or creation error
  useEffect(() => {
    if (creationFailure) {
      // failed to load the entry
      if (exception?.item_id) {
        toasts.addDanger(getUpdateErrorMessage(creationFailure));
      } else {
        toasts.addDanger(getCreateErrorMessage(creationFailure));
      }
      dispatch({
        type: 'hostIsolationExceptionsFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
    }
  }, [creationFailure, dispatch, exception?.item_id, toasts]);

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
});

HostIsolationExceptionsFormFlyout.displayName = 'HostIsolationExceptionsFormFlyout';
