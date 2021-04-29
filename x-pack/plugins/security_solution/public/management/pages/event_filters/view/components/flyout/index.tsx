/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useEffect, useCallback } from 'react';
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
import { AppAction } from '../../../../../../common/store/actions';
import { EventFiltersForm } from '../form';
import { useEventFiltersSelector, useEventFiltersNotification } from '../../hooks';
import {
  getFormHasError,
  isCreationInProgress,
  isCreationSuccessful,
} from '../../../store/selector';
import { getInitialExceptionFromEvent } from '../../../store/utils';

export interface EventFiltersFlyoutProps {
  id?: string;
  onCancel(): void;
}

export const EventFiltersFlyout: React.FC<EventFiltersFlyoutProps> = memo(({ onCancel, id }) => {
  useEventFiltersNotification();
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const formHasError = useEventFiltersSelector(getFormHasError);
  const creationInProgress = useEventFiltersSelector(isCreationInProgress);
  const creationSuccessful = useEventFiltersSelector(isCreationSuccessful);

  useEffect(() => {
    if (creationSuccessful) {
      onCancel();
      dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
    }
  }, [creationSuccessful, onCancel, dispatch]);

  // Initialize the store with the id passed as prop to allow render the form. It acts as componentDidMount
  useEffect(() => {
    if (id) {
      dispatch({
        type: 'eventFiltersInitFormFromId',
        payload: { id },
      });
    } else {
      dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry: getInitialExceptionFromEvent() },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnCancel = useCallback(() => {
    if (creationInProgress) return;
    onCancel();
  }, [creationInProgress, onCancel]);

  const confirmButtonMemo = useMemo(
    () => (
      <EuiButton
        data-test-subj="add-exception-confirm-button"
        fill
        disabled={formHasError || creationInProgress}
        onClick={() => dispatch({ type: 'eventFiltersCreateStart' })}
        isLoading={creationInProgress}
      >
        <FormattedMessage
          id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.confirm"
          defaultMessage="Add Endpoint Event Filter"
        />
      </EuiButton>
    ),
    [dispatch, formHasError, creationInProgress]
  );

  return (
    <EuiFlyout size="l" onClose={handleOnCancel}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.eventFiltersFlyout.title"
              defaultMessage="Endpoint Security"
            />
          </h2>
        </EuiTitle>
        <FormattedMessage
          id="xpack.securitySolution.eventFilters.eventFiltersFlyout.subtitle"
          defaultMessage="Add Endpoint Event Filter"
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EventFiltersForm allowSelectOs />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={handleOnCancel}>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.cancel"
                defaultMessage="cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{confirmButtonMemo}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});

EventFiltersFlyout.displayName = 'EventFiltersFlyout';
