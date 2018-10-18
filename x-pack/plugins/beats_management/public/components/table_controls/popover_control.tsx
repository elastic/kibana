/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiPopover } from '@elastic/eui';
import React from 'react';
import { AssignmentActionType } from '../table';
import { AssignmentControlSchema } from '../table/assignment_schema';
import { OptionControl } from './option_control';

interface PopoverControlProps {
  items: any[];
  schema: AssignmentControlSchema;
  selectionCount: number;
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

interface PopoverControlState {
  showPopover: boolean;
}

export class PopoverControl extends React.PureComponent<PopoverControlProps, PopoverControlState> {
  constructor(props: PopoverControlProps) {
    super(props);

    this.state = {
      showPopover: false,
    };
  }

  public componentDidMount() {
    const {
      schema: { lazyLoad },
    } = this.props;
    if (!lazyLoad) {
      this.props.actionHandler(AssignmentActionType.Reload);
    }
  }

  public render() {
    const {
      actionHandler,
      items,
      schema: { children, lazyLoad, name },
      selectionCount,
    } = this.props;
    return (
      <EuiPopover
        button={
          <EuiButton
            color="primary"
            iconSide="right"
            iconType="arrowDown"
            onClick={() => {
              if (lazyLoad) {
                actionHandler(AssignmentActionType.Reload);
              }
              this.setState({
                showPopover: true,
              });
            }}
          >
            {name}
          </EuiButton>
        }
        closePopover={() => {
          this.setState({ showPopover: false });
        }}
        id="assignmentList"
        isOpen={this.state.showPopover}
        panelPaddingSize="s"
        withTitle
      >
        {children
          ? children.map(def => (
              <OptionControl
                actionHandler={actionHandler}
                schema={def}
                selectionCount={selectionCount}
                key={def.name}
                items={items}
              />
            ))
          : null}
      </EuiPopover>
    );
  }
}
