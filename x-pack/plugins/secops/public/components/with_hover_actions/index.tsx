/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

interface Props {
  /**
   * The contents of the hover menu. It is highly recommended you wrap this
   * content in a `div` with `position: absolute` to prevent it from effecting
   * layout, and to adjust it's position via `top` and `left`
   */
  hoverContent: JSX.Element;
  /** The content that will be wrapped with hover actions */
  children: JSX.Element;
}

interface State {
  showActions: boolean;
}

const HoverActionsPanelContainer = styled.div`
  position: relative;
  width: 10px;
`;

const HoverActionsPanel = pure<{ children: JSX.Element; show: boolean }>(({ children, show }) => (
  <HoverActionsPanelContainer data-test-subj="hover-actions-panel-container">
    {show ? children : null}
  </HoverActionsPanelContainer>
));

const WithHoverActionsContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

/** A HOC that decorates it's children with actions that are visible on hover */
export class WithHoverActions extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { showActions: false };
  }

  public render() {
    const { hoverContent, children } = this.props;

    return (
      <WithHoverActionsContainer onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <div>{children}</div>
        <HoverActionsPanel show={this.state.showActions}>{hoverContent}</HoverActionsPanel>
      </WithHoverActionsContainer>
    );
  }

  private onMouseEnter = () => {
    this.setState({ showActions: true });
  };

  private onMouseLeave = () => {
    this.setState({ showActions: false });
  };
}
