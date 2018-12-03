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
import { defaultWidth } from '../timeline/body';

export const Overlay = styled.div`
  position: absolute;
  top: 15%;
  right: 0%;
  width: 30px;
  z-index: 1;
  height: 60%;
`;

export const Button = styled(EuiPanel)`
  padding: 10px 0 10px 0;
  display: flex;
  position: absolute;
  top: 30%;
  right: 5%;
  width: 100%;
  z-index: 2;
  justify-content: center;
  text-align: center;
  border-top: 1px solid #c5c5c5;
  border-bottom: 1px solid #c5c5c5;
  border-left: 1px solid #c5c5c5;
  border-radius: 6px 0 0 6px;
  box-shadow: 0 3px 3px -1px rgba(173, 173, 173, 0.5), 0 5px 7px -2px rgba(173, 173, 173, 0.5);
  background-color: #fff;
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

interface DispatchProps {
  showTimeline: ({ id, show }: { id: string; show: boolean }) => void;
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
  timelineId: string;
  onOpen: () => void;
}

export const FlyoutButton = pure(({ onOpen }: FlyoutButtonProps) => (
  <Overlay data-test-subj="flyoutOverlay" onClick={onOpen} onMouseEnter={onOpen}>
    <Button>
      <Text data-test-subj="flyoutButton">T I M E L I N E</Text>
    </Button>
  </Overlay>
));

export const FlyoutComponent = pure<Props>(({ show, timelineId, showTimeline, children }) => (
  <>
    <Visible show={show}>
      <FlyoutPane onClose={() => showTimeline({ id: timelineId, show: false })}>
        {children}
      </FlyoutPane>
      >
    </Visible>
    {show ? null : (
      <FlyoutButton
        timelineId={timelineId}
        onOpen={() => showTimeline({ id: timelineId, show: true })}
      />
    )}
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
