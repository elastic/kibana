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
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

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

interface Props {
  children?: React.ReactNode;
  isFlyoutVisible?: boolean;
}

interface State {
  isFlyoutVisible: boolean;
}

type SetState = (opts: State) => void;

export const showFlyout = (isFlyoutVisible: boolean, setState: SetState) =>
  setState({ isFlyoutVisible });

export const closeFlyout = (setState: SetState) => showFlyout(false, setState);

export const openFlyout = (setState: SetState) => showFlyout(true, setState);

interface FlyoutPaneProps {
  onClose: () => void;
  children: React.ReactNode;
}

export const FlyoutPane = pure(({ onClose, children }: FlyoutPaneProps) => (
  <EuiFlyout onClose={onClose} aria-labelledby="flyoutTitle" data-test-subj="flyout">
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
}

export const FlyoutButton = pure(({ onOpen }: FlyoutButtonProps) => (
  <Overlay data-test-subj="flyoutOverlay" onMouseEnter={onOpen}>
    <Button>
      <Text data-test-subj="flyoutButton">T I M E L I N E</Text>
    </Button>
  </Overlay>
));

export class Flyout extends React.PureComponent<Props, State> {
  public readonly state = {
    isFlyoutVisible: this.props.isFlyoutVisible ? this.props.isFlyoutVisible : false,
  };

  public render = () =>
    this.state.isFlyoutVisible ? (
      <FlyoutPane onClose={this.onClose}>{this.props.children}</FlyoutPane>
    ) : (
      <FlyoutButton onOpen={this.onOpen} />
    );

  /** Provides stable instance reference for avoiding re-renders */
  private onClose = () => closeFlyout(this.setState.bind(this));

  /** Provides stable instance reference for avoiding re-renders */
  private onOpen = () => openFlyout(this.setState.bind(this));
}
