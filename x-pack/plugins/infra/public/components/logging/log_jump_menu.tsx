/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { timeDay, timeHour, timeMonth, timeWeek, timeYear } from 'd3-time';
import * as React from 'react';

interface LogJumpMenuProps {
  jumpToTime: (time: number) => any;
}

interface LogJumpMenuState {
  isShown: boolean;
}

export class LogJumpMenu extends React.Component<
  LogJumpMenuProps,
  LogJumpMenuState
> {
  public readonly state = {
    isShown: false,
  };

  public show = () => {
    this.setState({
      isShown: true,
    });
  };

  public hide = () => {
    this.setState({
      isShown: false,
    });
  };

  public toggleVisibility = () => {
    this.setState(state => ({
      isShown: !state.isShown,
    }));
  };

  public jumpToTime = (time: number) => {
    this.hide();
    this.props.jumpToTime(time);
  };

  public getPanels = () => [
    {
      id: 'jumpToPredefinedTargets',
      items: [
        {
          name: 'Now',
          onClick: () => this.jumpToTime(Date.now()),
        },
        {
          name: 'Previous Hour',
          onClick: () => this.jumpToTime(timeHour.floor(new Date()).getTime()),
        },
        {
          name: 'Previous Day',
          onClick: () => this.jumpToTime(timeDay.floor(new Date()).getTime()),
        },
        {
          name: 'Previous Week',
          onClick: () => this.jumpToTime(timeWeek.floor(new Date()).getTime()),
        },
        {
          name: 'Previous Month',
          onClick: () => this.jumpToTime(timeMonth.floor(new Date()).getTime()),
        },
        {
          name: 'Previous Year',
          onClick: () => this.jumpToTime(timeYear.floor(new Date()).getTime()),
        },
        {
          name: 'Custom Time',
          panel: 'jumpToCustomTarget',
        },
      ],
      title: 'Jump to...',
    },
    {
      content: <div>form goes here</div>,
      id: 'jumpToCustomTarget',
      title: 'Custom time',
    },
  ];

  public render() {
    const { isShown } = this.state;

    const menuButton = (
      <EuiButtonEmpty
        color="text"
        iconType="calendar"
        onClick={this.toggleVisibility}
        size="xs"
      >
        Jump to time
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="jumpPopover"
        button={menuButton}
        closePopover={this.hide}
        isOpen={isShown}
        anchorPosition="downLeft"
        ownFocus
        withTitle
        panelPaddingSize="none"
      >
        <EuiContextMenu
          initialPanelId="jumpToPredefinedTargets"
          panels={this.getPanels()}
        />
      </EuiPopover>
    );
  }
}
