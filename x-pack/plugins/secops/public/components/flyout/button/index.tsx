/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiPanel, EuiText } from '@elastic/eui';

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Theme } from '../../../store/local/app/model';
import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import { droppableTimelineFlyoutButtonPrefix } from '../../drag_and_drop/helpers';
import { DataProvider } from '../../timeline/data_providers/data_provider';
import * as i18n from './translations';

const Container = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  position: absolute;
  top: 40%;
  right: 0%;
  min-width: 50px;
  max-width: 80px;
  z-index: 1;
  height: 240px;
  max-height: 240px;
`;

const BadgeButtonContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
`;

export const Button = styled(EuiPanel)`
  display: flex;
  z-index: 2;
  justify-content: center;
  text-align: center;
  border-top: 1px solid #c5c5c5;
  border-bottom: 1px solid #c5c5c5;
  border-left: 1px solid #c5c5c5;
  border-radius: 6px 0 0 6px;
  box-shadow: 0 3px 3px -1px rgba(173, 173, 173, 0.5), 0 5px 7px -2px rgba(173, 173, 173, 0.5);
  background-color: inherit;
  cursor: pointer;
`;

export const Text = styled(EuiText)`
  width: 12px;
  z-index: 3;
  user-select: none;
`;

export const Badge = styled(EuiBadge)`
  border-radius: 5px;
  min-width: 25px;
  padding: 0px;
  transform: translateY(10px);
  z-index: 3;
`;
interface FlyoutButtonProps {
  dataProviders: DataProvider[];
  onOpen: () => void;
  show: boolean;
  timelineId: string;
  theme: Theme;
}

export const FlyoutButton = pure(
  ({ onOpen, show, dataProviders, theme, timelineId }: FlyoutButtonProps) =>
    show ? (
      <Container>
        <DroppableWrapper
          droppableId={`${droppableTimelineFlyoutButtonPrefix}${timelineId}`}
          theme={theme}
        >
          <BadgeButtonContainer data-test-subj="flyoutOverlay" onClick={onOpen}>
            {dataProviders.length !== 0 && (
              <Badge data-test-subj="badge" color="primary">
                {dataProviders.length}
              </Badge>
            )}
            <Button>
              <Text data-test-subj="flyoutButton">
                {i18n.TIMELINE.toLocaleUpperCase()
                  .split('')
                  .join(' ')}
              </Text>
            </Button>
          </BadgeButtonContainer>
        </DroppableWrapper>
      </Container>
    ) : null
);
