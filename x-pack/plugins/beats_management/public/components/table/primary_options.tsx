/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { ActionDefinition, FilterDefinition } from '../table';
import { ActionButton } from './action_button';
interface PrimaryOptionsProps {
  filters: FilterDefinition[] | null;
  primaryActions: ActionDefinition[];
  actionHandler(actionType: string, payload?: any): void;
  onSearchQueryChange(query: any): void;
}

interface PrimaryOptionsState {
  isPopoverVisible: boolean;
}

export class PrimaryOptions extends React.PureComponent<PrimaryOptionsProps, PrimaryOptionsState> {
  constructor(props: PrimaryOptionsProps) {
    super(props);

    this.state = {
      isPopoverVisible: false,
    };
  }
  public render() {
    const { actionHandler, primaryActions } = this.props;
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <ActionButton
            actionHandler={actionHandler}
            actions={primaryActions}
            isPopoverVisible={this.state.isPopoverVisible}
            hidePopover={this.hidePopover}
            showPopover={this.showPopover}
          />
        </EuiFlexItem>
        <EuiFlexItem>{/* <KueryBar /> */}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  private hidePopover = () => this.setState({ isPopoverVisible: false });
  private showPopover = () => this.setState({ isPopoverVisible: true });
}
