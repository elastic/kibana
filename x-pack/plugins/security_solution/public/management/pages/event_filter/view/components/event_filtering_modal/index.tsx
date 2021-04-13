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
import { EventFilteringForm } from '../event_filtering_form';
import { useEventFilterSelector } from '../../hooks';
import {
  getFormHasError,
  isCreationInProgress,
  isCreationSuccessful,
} from '../../../store/selector';
import { getInitialExceptionFromEvent } from '../../../store/utils';
import { MODAL_TITLE, MODAL_SUBTITLE, ACTIONS_CONFIRM, ACTIONS_CANCEL } from './translations';

export interface EventFilteringModalProps {
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

    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

export const EventFilteringModal: React.FC<EventFilteringModalProps> = memo(
  ({ data, onCancel }) => {
    const dispatch = useDispatch<Dispatch<AppAction>>();
    const formHasError = useEventFilterSelector(getFormHasError);
    const creationInProgress = useEventFilterSelector(isCreationInProgress);
    const creationSuccessful = useEventFilterSelector(isCreationSuccessful);

    useEffect(() => {
      if (creationSuccessful) {
        onCancel();
        dispatch({
          type: 'eventFilterFormStateChanged',
          payload: {
            type: 'UninitialisedResourceState',
          },
        });
      }
    }, [creationSuccessful, onCancel, dispatch]);

    useEffect(() => {
      dispatch({
        type: 'eventFilterInitForm',
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
            dispatch({ type: 'eventFilterCreateStart' });
          }}
          isLoading={creationInProgress}
        >
          {ACTIONS_CONFIRM}
        </EuiButton>
      ),
      [dispatch, formHasError, creationInProgress]
    );

    const modalBodyMemo = useMemo(
      () => (
        <ModalBodySection className="builder-section">
          <EventFilteringForm />
        </ModalBodySection>
      ),
      []
    );

    return (
      <Modal onClose={onCancel} data-test-subj="add-exception-modal">
        <ModalHeader>
          <EuiModalHeaderTitle>{MODAL_TITLE}</EuiModalHeaderTitle>
          <ModalHeaderSubtitle>{MODAL_SUBTITLE}</ModalHeaderSubtitle>
        </ModalHeader>

        {modalBodyMemo}

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={handleOnCancel}>
            {ACTIONS_CANCEL}
          </EuiButtonEmpty>
          {confirmButtonMemo}
        </EuiModalFooter>
      </Modal>
    );
  }
);

EventFilteringModal.displayName = 'EventFilteringModal';
