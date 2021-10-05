/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useEffect, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Loader } from '../../../../../common/components/loader';
import { HostIsolationExceptionsPageAction } from '../../store/action';
import { HostIsolationExceptionsForm } from './form';
import { useHostIsolationExceptionsSelector } from '../hooks';
import {
  isLoadedResourceState,
  isLoadingResourceState,
} from '../../../../state/async_resource_state';
import { createEmptyHostIsolationException } from '../../utils';

export const HostIsolationExceptionsFormFlyout: React.FC<{
  type?: 'create' | 'edit';
  id?: string;
  onCancel(): void;
}> = memo(({ onCancel }) => {
  // useEventFiltersNotification();
  const dispatch = useDispatch<Dispatch<HostIsolationExceptionsPageAction>>();

  const [formHasError, setFormHasError] = useState(true);

  const [exception, setException] = useState<CreateExceptionListItemSchema | undefined>(undefined);

  useEffect(() => {
    setException(createEmptyHostIsolationException());
  }, []);

  const creationInProgress = useHostIsolationExceptionsSelector((state) =>
    isLoadingResourceState(state.form.status)
  );
  const creationSuccessful = useHostIsolationExceptionsSelector((state) =>
    isLoadedResourceState(state.form.status)
  );

  useEffect(() => {
    if (creationSuccessful) {
      onCancel();
      dispatch({
        type: 'hostIsolationExceptionsFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
    }
  }, [creationSuccessful, onCancel, dispatch]);

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
      size="l"
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
            <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={handleOnCancel}>
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
