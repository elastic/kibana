/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import styled, { css } from 'styled-components';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { AppAction } from '../../../../../../common/store/actions';
import { Ecs } from '../../../../../../../common/ecs';
import { EventFiltersForm } from '../form';
import { useEventFiltersSelector, useEventFiltersNotification } from '../../hooks';
import {
  getFormHasError,
  isCreationInProgress,
  isCreationSuccessful,
} from '../../../store/selector';
import { getInitialExceptionFromEvent } from '../../../store/utils';
import { MODAL_TITLE, MODAL_SUBTITLE, ACTIONS_CONFIRM, ACTIONS_CANCEL } from './translations';

export interface EventFiltersModalProps {
  data: Ecs;
  onCancel(): void;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => css`
    width: ${theme.eui.euiBreakpoints.l};
    max-width: ${theme.eui.euiBreakpoints.l};
  `}
`;

const ModalHeader = styled(EuiModalHeader)`
  flex-direction: column;
  align-items: flex-start;
`;

const ModalHeaderSubtitle = styled.div`
  ${({ theme }) => css`
    color: ${theme.eui.euiColorMediumShade};
  `}
`;

const ModalBodySection = styled.section`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS} ${theme.eui.euiSizeL};
    overflow-y: scroll;
  `}
`;

export const EventFiltersModal: React.FC<EventFiltersModalProps> = memo(({ data, onCancel }) => {
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

  // Initialize the store with the event passed as prop to allow render the form. It acts as componentDidMount
  useEffect(() => {
    dispatch({
      type: 'eventFiltersInitForm',
      payload: { entry: getInitialExceptionFromEvent(data) },
    });
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
        onClick={() => {
          dispatch({ type: 'eventFiltersCreateStart' });
        }}
        isLoading={creationInProgress}
      >
        {ACTIONS_CONFIRM}
      </EuiButton>
    ),
    [dispatch, formHasError, creationInProgress]
  );

  return (
    <Modal onClose={handleOnCancel} data-test-subj="add-exception-modal">
      <ModalHeader>
        <EuiModalHeaderTitle>{MODAL_TITLE}</EuiModalHeaderTitle>
        <ModalHeaderSubtitle>{MODAL_SUBTITLE}</ModalHeaderSubtitle>
      </ModalHeader>

      <ModalBodySection>
        <EventFiltersForm />
      </ModalBodySection>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={handleOnCancel}>
          {ACTIONS_CANCEL}
        </EuiButtonEmpty>
        {confirmButtonMemo}
      </EuiModalFooter>
    </Modal>
  );
});

EventFiltersModal.displayName = 'EventFiltersModal';
