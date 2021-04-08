/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useEffect } from 'react';
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
import { useGetInitialExceptionFromEvent, useEventFiltersSelector } from '../../hooks';
import { getFormHasError, getFormIsLoadingAction } from '../../../store/selector';
import { ACTIONS_TITLE, ACTIONS_CONFIRM, ACTIONS_CANCEL } from './translations';

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
    const formHasError = useEventFiltersSelector(getFormHasError);
    const formIsLoadingAction = useEventFiltersSelector(getFormIsLoadingAction);

    const entry = useGetInitialExceptionFromEvent(data);
    useEffect(() => {
      dispatch({ type: 'eventFilterInitForm', payload: { entry } });
    }, [dispatch, entry]);

    const confirmButtonMemo = useMemo(
      () => (
        <EuiButton
          data-test-subj="add-exception-confirm-button"
          fill
          disabled={formHasError || formIsLoadingAction}
          onClick={() => {
            dispatch({ type: 'eventFilterCreateStart' });
          }}
          isLoading={formIsLoadingAction}
        >
          {ACTIONS_CONFIRM}
        </EuiButton>
      ),
      [dispatch, formHasError, formIsLoadingAction]
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
          <EuiModalHeaderTitle>{ACTIONS_TITLE}</EuiModalHeaderTitle>
        </ModalHeader>

        {modalBodyMemo}

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={onCancel}>
            {ACTIONS_CANCEL}
          </EuiButtonEmpty>
          {confirmButtonMemo}
        </EuiModalFooter>
      </Modal>
    );
  }
);

EventFilteringModal.displayName = 'EventFilteringModal';
