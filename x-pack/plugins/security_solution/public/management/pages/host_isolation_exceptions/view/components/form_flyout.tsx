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
import { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
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
import { createEmptyHostIsolationException } from '../../utils';
import {
  useHostIsolationExceptionsNavigateCallback,
  useHostIsolationExceptionsSelector,
} from '../hooks';
import { HostIsolationExceptionsForm } from './form';

export const HostIsolationExceptionsFormFlyout: React.FC<{}> = memo(() => {
  const dispatch = useDispatch<Dispatch<HostIsolationExceptionsPageAction>>();
  const toasts = useToasts();

  const creationInProgress = useHostIsolationExceptionsSelector((state) =>
    isLoadingResourceState(state.form.status)
  );
  const creationSuccessful = useHostIsolationExceptionsSelector((state) =>
    isLoadedResourceState(state.form.status)
  );
  const creationFailure = useHostIsolationExceptionsSelector((state) =>
    isFailedResourceState(state.form.status)
  );

  const navigateCallback = useHostIsolationExceptionsNavigateCallback();

  const [formHasError, setFormHasError] = useState(true);
  const [exception, setException] = useState<CreateExceptionListItemSchema | undefined>(undefined);

  const onCancel = useCallback(
    () =>
      navigateCallback({
        show: undefined,
        id: undefined,
      }),
    [navigateCallback]
  );

  useEffect(() => {
    setException(createEmptyHostIsolationException());
  }, []);

  useEffect(() => {
    if (creationSuccessful) {
      onCancel();
      dispatch({
        type: 'hostIsolationExceptionsFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
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
  }, [creationSuccessful, onCancel, dispatch, toasts, exception?.name]);

  useEffect(() => {
    if (creationFailure) {
      toasts.addDanger(
        i18n.translate(
          'xpack.securitySolution.hostIsolationExceptions.form.creationFailureToastTitle',
          {
            defaultMessage: 'There was an error creating the exception',
          }
        )
      );
    }
  }, [dispatch, toasts, creationFailure]);

  const handleOnCancel = useCallback(() => {
    if (creationInProgress) return;
    onCancel();
  }, [creationInProgress, onCancel]);

  const handleOnSubmit = useCallback(() => {
    dispatch({
      type: 'hostIsolationExceptionsCreateEntry',
      payload: exception,
    });
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
        <FormattedMessage
          id="xpack.securitySolution.hostIsolationExceptions.flyout.actions.create"
          defaultMessage="Add Host Isolation Exception"
        />
      </EuiButton>
    ),
    [formHasError, creationInProgress, handleOnSubmit]
  );

  return exception ? (
    <EuiFlyout
      size="m"
      onClose={handleOnCancel}
      data-test-subj="hostIsolationExceptionsCreateEditFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.flyout.title"
              defaultMessage="Add Host Isolation Exception"
            />
          </h2>
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
