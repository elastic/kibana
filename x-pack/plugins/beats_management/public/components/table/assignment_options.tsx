/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import React from 'react';
import { ActionButton } from './action_button';
import { ControlDefinitions } from './table_type_configs';

interface AssignmentOptionsProps {
  assignmentOptions: any[] | null;
  assignmentTitle: string | null;
  renderAssignmentOptions?: (item: any, key: string) => any;
  controlDefinitions: ControlDefinitions;
  selectionCount: number;
  actionHandler(action: string, payload?: any): void;
}

interface AssignmentOptionsState {
  isAssignmentPopoverVisible: boolean;
  isActionPopoverVisible: boolean;
}

export class AssignmentOptions extends React.Component<
  AssignmentOptionsProps,
  AssignmentOptionsState
> {
  constructor(props: AssignmentOptionsProps) {
    super(props);

    this.state = {
      isAssignmentPopoverVisible: false,
      isActionPopoverVisible: false,
    };
  }

  public render() {
    const {
      actionHandler,
      assignmentOptions,
      renderAssignmentOptions,
      assignmentTitle,
      controlDefinitions: { actions },
      selectionCount,
    } = this.props;
    const { isActionPopoverVisible, isAssignmentPopoverVisible } = this.state;
    return (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>{selectionCount} selected</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ActionButton
            actions={actions}
            actionHandler={actionHandler}
            hidePopover={() => {
              this.setState({ isActionPopoverVisible: false });
            }}
            isPopoverVisible={isActionPopoverVisible}
            showPopover={() => {
              this.setState({ isActionPopoverVisible: true });
            }}
          />
        </EuiFlexItem>
        {assignmentTitle && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButton
                  color="primary"
                  iconSide="right"
                  iconType="arrowDown"
                  onClick={() => {
                    this.setState({
                      isAssignmentPopoverVisible: true,
                    });
                    actionHandler('loadAssignmentOptions');
                  }}
                >
                  {assignmentTitle}
                </EuiButton>
              }
              closePopover={() => {
                this.setState({ isAssignmentPopoverVisible: false });
              }}
              id="assignmentList"
              isOpen={isAssignmentPopoverVisible}
              panelPaddingSize="s"
              withTitle
            >
              {assignmentOptions && renderAssignmentOptions ? (
                // @ts-ignore direction prop not available on current typing
                <EuiFlexGroup direction="column" gutterSize="xs">
                  {assignmentOptions.map((options, index) =>
                    renderAssignmentOptions(options, `${index}`)
                  )}
                </EuiFlexGroup>
              ) : (
                <div>
                  <EuiLoadingSpinner size="m" /> Loading
                </div>
              )}
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
}
