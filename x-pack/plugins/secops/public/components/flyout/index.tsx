/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { defaultTo, getOr } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import styled from 'styled-components';

import { State, timelineActions } from '../../store';
import { timelineByIdSelector } from '../../store/selectors';
import { DroppableWrapper } from '../drag_and_drop/droppable_wrapper';
import { droppableTimelineFlyoutButtonPrefix } from '../drag_and_drop/helpers';
import { defaultWidth } from '../timeline/body';

const Container = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  position: absolute;
  top: 40%;
  right: 0%;
  min-width: 30px;
  max-width: 200px;
  z-index: 1;
  height: 206px;
  max-height: 206px;
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
`;

const Visible = styled.div<{ show: boolean }>`
  visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
`;

interface OwnProps {
  timelineId: string;
  children?: React.ReactNode;
}

type ShowTimeline = (params: { id: string; show: boolean }) => void;

interface DispatchProps {
  showTimeline: ShowTimeline;
}

interface StateReduxProps {
  show: boolean;
}

type Props = OwnProps & DispatchProps & StateReduxProps;

interface FlyoutPaneProps {
  onClose: () => void;
  children: React.ReactNode;
}

export const FlyoutPane = pure(({ onClose, children }: FlyoutPaneProps) => (
  <EuiFlyout
    size="l"
    maxWidth={defaultWidth + 50}
    onClose={onClose}
    aria-labelledby="flyoutTitle"
    data-test-subj="flyout"
  >
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 data-test-subj="flyoutTitle" id="flyoutTitle">
          Timeline
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody data-test-subj="flyoutChildren">{children}</EuiFlyoutBody>
  </EuiFlyout>
));

interface FlyoutButtonProps {
  onOpen: () => void;
  show: boolean;
  timelineId: string;
}

export const FlyoutButton = pure(
  ({ onOpen, show, timelineId }: FlyoutButtonProps) =>
    show ? (
      <Container>
        <DroppableWrapper droppableId={`${droppableTimelineFlyoutButtonPrefix}${timelineId}`}>
          <div data-test-subj="flyoutOverlay" onClick={onOpen}>
            <Button>
              <Text data-test-subj="flyoutButton">T I M E L I N E</Text>
            </Button>
          </div>
        </DroppableWrapper>
      </Container>
    ) : null
);

export const FlyoutComponent = pure<Props>(({ show, timelineId, showTimeline, children }) => (
  <>
    <Visible show={show}>
      <FlyoutPane onClose={() => showTimeline({ id: timelineId, show: false })}>
        {children}
      </FlyoutPane>
    </Visible>
    <FlyoutButton
      show={!show}
      timelineId={timelineId}
      onOpen={() => showTimeline({ id: timelineId, show: true })}
    />
  </>
));

const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
  const timelineById = defaultTo({}, timelineByIdSelector(state));
  const show = getOr('false', `${timelineId}.show`, timelineById);

  return { show };
};

export const Flyout = connect(
  mapStateToProps,
  {
    showTimeline: timelineActions.showTimeline,
  }
)(FlyoutComponent);
