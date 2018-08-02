/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import React from 'react';
import { ControlDefinitions } from './table_type_configs';

interface ControlBarProps {
  assignmentOptions: any[] | null;
  assignmentTitle: string | null;
  showAssignmentOptions: boolean;
  controlDefinitions: ControlDefinitions;
  selectionCount: number;
  actionHandler(actionType: string, payload?: any): void;
}

interface ControlBarState {
  isPopoverVisible: boolean;
  isAssignmentPopoverVisible: boolean;
}

export class ControlBar extends React.Component<ControlBarProps, ControlBarState> {
  constructor(props: ControlBarProps) {
    super(props);

    this.state = {
      isPopoverVisible: false,
      isAssignmentPopoverVisible: false,
    };
  }

  public render() {
    const { selectionCount, showAssignmentOptions } = this.props;
    return selectionCount !== 0 && showAssignmentOptions
      ? this.renderAssignmentOptions()
      : this.renderDefaultControls();
  }

  private renderAssignmentOptions = () => (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>{this.renderActionButton()}</EuiFlexItem>
      <EuiFlexItem>{this.props.selectionCount} selected</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton color="danger">Disenroll Selected</EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButton
              color="primary"
              iconSide="right"
              iconType="arrowDown"
              onClick={() => {
                this.showAssignmentPopover();
                this.props.actionHandler('loadAssignmentOptions');
              }}
            >
              {this.props.assignmentTitle}
            </EuiButton>
          }
          closePopover={this.hideAssignmentPopover}
          id="assignmentList"
          isOpen={this.state.isAssignmentPopoverVisible}
          panelPaddingSize="s"
          withTitle
        >
          {this.props.assignmentOptions ? (
            // @ts-ignore direction prop not available on current typing
            <EuiFlexGroup direction="column" gutterSize="xs">
              {this.props.assignmentOptions}
            </EuiFlexGroup>
          ) : (
            <div>
              <EuiLoadingSpinner size="m" /> Loading
            </div>
          )}
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  private renderDefaultControls = () => (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>{this.renderActionButton()}</EuiFlexItem>
      <EuiFlexItem>
        <EuiSearchBar
          box={{ incremental: true }}
          filters={this.props.controlDefinitions.filters}
          onChange={(query: any) => this.props.actionHandler('search', query)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  private renderActionButton = () => {
    const {
      controlDefinitions: { actions },
      actionHandler,
    } = this.props;

    if (actions.length === 0) {
      return null;
    } else if (actions.length === 1) {
      const action = actions[0];
      return (
        <EuiButton
          color={action.danger ? 'danger' : 'primary'}
          onClick={() => actionHandler(action.action)}
        >
          {action.name}
        </EuiButton>
      );
    }
    return (
      <EuiPopover
        anchorPosition="downLeft"
        button={
          <EuiButton iconSide="right" iconType="arrowDown" onClick={this.showPopover}>
            Bulk Action
          </EuiButton>
        }
        closePopover={this.hidePopover}
        id="contextMenu"
        isOpen={this.state.isPopoverVisible}
        panelPaddingSize="none"
        withTitle
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={[
            {
              id: 0,
              title: 'Bulk Actions',
              items: actions.map(action => ({
                ...action,
                onClick: () => actionHandler(action.action),
              })),
            },
          ]}
        />
      </EuiPopover>
    );
  };

  private hideAssignmentPopover = () => {
    this.setState({
      isAssignmentPopoverVisible: false,
    });
  };

  private showAssignmentPopover = () => {
    this.setState({
      isAssignmentPopoverVisible: true,
    });
  };

  private hidePopover = () => {
    this.setState({
      isPopoverVisible: false,
    });
  };

  private showPopover = () => {
    this.setState({
      isPopoverVisible: true,
    });
  };
}
