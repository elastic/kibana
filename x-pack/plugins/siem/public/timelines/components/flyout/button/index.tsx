/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiNotificationBadge, EuiIcon, EuiButton } from '@elastic/eui';
import { rgba } from 'polished';
import React from 'react';
import styled from 'styled-components';

import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import {
  droppableTimelineFlyoutButtonPrefix,
  IS_DRAGGING_CLASS_NAME,
} from '../../drag_and_drop/helpers';
import { DataProvider } from '../../timeline/data_providers/data_provider';

import * as i18n from './translations';

export const NOT_READY_TO_DROP_CLASS_NAME = 'not-ready-to-drop';
export const READY_TO_DROP_CLASS_NAME = 'ready-to-drop';

const Container = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  padding-top: 8px;
  position: fixed;
  top: 40%;
  right: -51px;
  z-index: ${({ theme }) => theme.eui.euiZLevel9};
  transform: rotate(-90deg);
  user-select: none;

  button {
    border-radius: 4px 4px 0 0;
    box-shadow: none;
    height: 46px;
    margin: 1px 0 1px 1px;
    width: 136px;
  }

  .euiButton:hover:not(:disabled) {
    transform: none;
  }

  .euiButton--primary:enabled {
    background: ${({ theme }) => theme.eui.euiColorEmptyShade};
    box-shadow: none;
  }

  .euiButton--primary:enabled:hover,
  .euiButton--primary:enabled:focus {
    animation: none;
    background: ${({ theme }) => theme.eui.euiColorEmptyShade};
    box-shadow: none;
  }

  .${IS_DRAGGING_CLASS_NAME} & .${NOT_READY_TO_DROP_CLASS_NAME} {
    color: ${({ theme }) => theme.eui.euiColorSuccess};
    background: ${({ theme }) => rgba(theme.eui.euiColorSuccess, 0.1)} !important;
    border: 1px solid ${({ theme }) => theme.eui.euiColorSuccess};
    border-bottom: none;
    text-decoration: none;
  }

  .${READY_TO_DROP_CLASS_NAME} {
    color: ${({ theme }) => theme.eui.euiColorSuccess};
    background: ${({ theme }) => rgba(theme.eui.euiColorSuccess, 0.2)} !important;
    border: 1px solid ${({ theme }) => theme.eui.euiColorSuccess};
    border-bottom: none;
    text-decoration: none;
  }
`;

Container.displayName = 'Container';

const BadgeButtonContainer = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
`;

BadgeButtonContainer.displayName = 'BadgeButtonContainer';

interface FlyoutButtonProps {
  dataProviders: DataProvider[];
  onOpen: () => void;
  show: boolean;
  timelineId: string;
}

export const FlyoutButton = React.memo<FlyoutButtonProps>(
  ({ onOpen, show, dataProviders, timelineId }) =>
    show ? (
      <Container onClick={onOpen}>
        <DroppableWrapper
          data-test-subj="flyout-droppable-wrapper"
          droppableId={`${droppableTimelineFlyoutButtonPrefix}${timelineId}`}
          render={({ isDraggingOver }) => (
            <BadgeButtonContainer
              className="flyout-overlay"
              data-test-subj="flyoutOverlay"
              onClick={onOpen}
            >
              {!isDraggingOver ? (
                <EuiButton
                  className={NOT_READY_TO_DROP_CLASS_NAME}
                  data-test-subj="flyout-button-not-ready-to-drop"
                  fill={false}
                  iconSide="right"
                  iconType="arrowUp"
                >
                  {i18n.FLYOUT_BUTTON}
                </EuiButton>
              ) : (
                <EuiButton
                  className={READY_TO_DROP_CLASS_NAME}
                  data-test-subj="flyout-button-ready-to-drop"
                  fill={false}
                >
                  <EuiIcon data-test-subj="flyout-button-plus-icon" type="plusInCircleFilled" />
                </EuiButton>
              )}

              <EuiNotificationBadge
                color="accent"
                data-test-subj="badge"
                style={{
                  left: '-9px',
                  position: 'relative',
                  top: '-6px',
                  transform: 'rotate(90deg)',
                  visibility: dataProviders.length !== 0 ? 'inherit' : 'hidden',
                  zIndex: 10,
                }}
              >
                {dataProviders.length}
              </EuiNotificationBadge>
            </BadgeButtonContainer>
          )}
        />
      </Container>
    ) : null,
  (prevProps, nextProps) =>
    prevProps.show === nextProps.show &&
    prevProps.dataProviders === nextProps.dataProviders &&
    prevProps.timelineId === nextProps.timelineId
);

FlyoutButton.displayName = 'FlyoutButton';
