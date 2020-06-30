/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint react/no-did-mount-set-state: 0, react/forbid-elements: 0 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiPopover, EuiToolTip } from '@elastic/eui';

interface Props {
  button: (handleClick: React.MouseEventHandler<HTMLButtonElement>) => React.ReactElement;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  children: (arg: { closePopover: () => void }) => React.ReactNode;
  isOpen?: boolean;
  ownFocus?: boolean;
  tooltip?: string;
  panelClassName?: string;
  anchorClassName?: string;
  anchorPosition?: string;
  panelPaddingSize?: 'none' | 's' | 'm' | 'l';
  id?: string;
  className?: string;
}

export type ClosePopoverFn = () => void;

interface State {
  isPopoverOpen: boolean;
}

export class Popover extends Component<Props, State> {
  static propTypes = {
    isOpen: PropTypes.bool,
    ownFocus: PropTypes.bool,
    button: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
    tooltip: PropTypes.string,
    tooltipPosition: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  };

  static defaultProps = {
    isOpen: false,
    ownFocus: true,
    tooltip: '',
    tooltipPosition: 'top',
  };

  state: State = {
    isPopoverOpen: !!this.props.isOpen,
  };

  componentDidMount() {
    if (this.props.isOpen) {
      this.setState({ isPopoverOpen: true });
    }
  }

  handleClick = () => {
    this.setState((state: any) => ({
      isPopoverOpen: !state.isPopoverOpen,
    }));
  };

  closePopover: ClosePopoverFn = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const { button, children, tooltip, tooltipPosition, ...rest } = this.props;

    const wrappedButton = (handleClick: any) => {
      // wrap button in tooltip, if tooltip text is provided
      if (!this.state.isPopoverOpen && tooltip && tooltip.length) {
        return (
          <EuiToolTip position={tooltipPosition} content={tooltip}>
            {button(handleClick)}
          </EuiToolTip>
        );
      }

      return button(handleClick);
    };

    const appWrapper = document.querySelector('.app-wrapper');
    const EuiPopoverAny = (EuiPopover as any) as React.FC<any>;

    return (
      <EuiPopoverAny
        {...rest}
        button={wrappedButton(this.handleClick)}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        container={appWrapper}
      >
        {children({ closePopover: this.closePopover })}
      </EuiPopoverAny>
    );
  }
}
