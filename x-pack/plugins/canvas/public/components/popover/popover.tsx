/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint react/no-did-mount-set-state: 0, react/forbid-elements: 0 */
import { EuiPopover, EuiPopoverProps, EuiToolTip } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { Component, MouseEvent, ReactElement, ReactNode } from 'react';

type ClickEventHandler = (event: MouseEvent<HTMLButtonElement>) => void;

export interface DefaultProps {
  /** Initial state of the popover */
  isOpen?: boolean;
  /** String to be displayed in the tooltip */
  tooltip?: string;
  /** Position of the tooltip */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export interface Props extends DefaultProps, EuiPopoverProps {
  /** Unique identifier for the popover */
  id: string;
  /** Function to generate the anchor button */
  button: (handleClick: ClickEventHandler) => ReactElement<any>;
  /** Function to generate the content of the popover */
  children: (helpers: { [key: string]: () => void }) => ReactNode;
  /** Remaining props that are passed into EuiPopover */
  rest?: EuiPopoverProps;
}

export interface Props {
  /** Unique identifier for the popover */
  id: string;
  /** Initial state of the popover */
  isOpen?: boolean;
  /** Function to generate the anchor button */
  button: (handleClick: ClickEventHandler) => ReactElement<any>;
  /** Function to generate the content of the popover */
  children: (helpers: { [key: string]: () => void }) => ReactNode;
  /** String to be displayed in the tooltip */
  tooltip?: string;
  /** Position of the tooltip */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export interface State {
  isPopoverOpen: boolean;
}

export class Popover extends Component<Props, State> {
  public static propTypes = {
    id: PropTypes.string.isRequired,
    isOpen: PropTypes.bool,
    button: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
    tooltip: PropTypes.string,
    tooltipPosition: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  };

  public static defaultProps: DefaultProps = {
    isOpen: false,
    tooltip: '',
    tooltipPosition: 'top',
  };

  public state = {
    isPopoverOpen: false,
  };

  public componentDidMount() {
    if (this.props.isOpen) {
      this.setState({ isPopoverOpen: true });
    }
  }

  public handleClick = () => {
    this.setState(state => ({
      isPopoverOpen: !state.isPopoverOpen,
    }));
  };

  public closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  public render() {
    const { button, children, id, tooltip, tooltipPosition, ...rest } = this.props;

    const wrappedButton = (handleClick: ClickEventHandler): ReactElement<any> => {
      // wrap button in tooltip, if tooltip text is provided
      if (!this.state.isPopoverOpen && tooltip.length) {
        return (
          <EuiToolTip position={tooltipPosition} content={tooltip}>
            {button(handleClick)}
          </EuiToolTip>
        );
      }

      return button(handleClick);
    };

    return (
      <EuiPopover
        {...rest}
        id={id}
        button={wrappedButton(this.handleClick)}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        ownFocus={true}
      >
        {children({ closePopover: this.closePopover })}
      </EuiPopover>
    );
  }
}
