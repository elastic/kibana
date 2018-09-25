/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React from 'react';
import { ActionButton } from './action_button';
import { AssignmentList } from './assignment_list';
import {
  AssignmentOptionList,
  AssignmentOptionSearch,
  BaseAssignmentOptions,
  isListOptions,
  isSearchOptions,
} from './assignment_option_types';
import { AssignmentSearch } from './assignment_search';
import { ControlDefinitions } from './table_type_configs';

interface AssignmentOptionsProps {
  assignmentOptions: AssignmentOptionList | AssignmentOptionSearch | BaseAssignmentOptions;
  controlDefinitions: ControlDefinitions;
  selectionCount: number;
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
      assignmentOptions,
      assignmentOptions: { actionHandler, title },
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
                {title}
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
            {isListOptions(assignmentOptions) && (
              <AssignmentList assignmentOptions={assignmentOptions} />
            )}
            {isSearchOptions(assignmentOptions) && <AssignmentSearch options={assignmentOptions} />}
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
