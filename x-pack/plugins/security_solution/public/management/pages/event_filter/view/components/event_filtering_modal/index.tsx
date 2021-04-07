/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
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
import { EventFilteringForm, OnChangeProps } from '../event_filtering_form';

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
    const [isSuccessButtonDisabled, setIsSuccessButtonDisabled] = useState(false);
    const handleOnFormChange = useCallback((arg: OnChangeProps) => {
      setIsSuccessButtonDisabled(arg.hasError);
    }, []);

    return (
      <Modal onClose={onCancel} data-test-subj="add-exception-modal">
        <ModalHeader>
          <EuiModalHeaderTitle>{'Add event filter'}</EuiModalHeaderTitle>
        </ModalHeader>

        <ModalBodySection className="builder-section">
          <EventFilteringForm eventData={data} onFormChange={handleOnFormChange} />
        </ModalBodySection>

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={onCancel}>
            {'cancel'}
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="add-exception-confirm-button"
            fill
            disabled={isSuccessButtonDisabled}
            onClick={() => {
              dispatch({ type: 'eventFilterCreateStart', payload: { entry: {} } });
              onCancel();
            }}
          >
            {'Confirm'}
          </EuiButton>
        </EuiModalFooter>
      </Modal>
    );
  }
);

EventFilteringModal.displayName = 'EventFilteringModal';
