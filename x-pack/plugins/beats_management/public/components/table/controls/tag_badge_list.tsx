/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import React from 'react';
import { TABLE_CONFIG } from '../../../../../../legacy/plugins/beats_management/common/constants/table';
import { TagBadge } from '../../tag/tag_badge';
import { AssignmentActionType } from '../index';

interface TagBadgeListProps {
  items: object[];
  disabled: boolean;
  name: string;
  action?: AssignmentActionType;
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

interface ComponentState {
  isPopoverOpen: boolean;
  items: object[];
}

export class TagBadgeList extends React.Component<TagBadgeListProps, ComponentState> {
  constructor(props: TagBadgeListProps) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      items: [],
    };
  }

  public render() {
    const button = (
      <EuiButton
        size="s"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
        disabled={this.props.disabled}
      >
        {this.props.name}
      </EuiButton>
    );

    return (
      <EuiPopover
        id="contentPanel"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel>
          <EuiFlexGroup direction="column" gutterSize="xs" style={{ margin: 10 }}>
            {!this.props.items && <EuiLoadingSpinner size="l" />}
            {this.props.items && this.props.items.length === 0 && (
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem>No options avaliable</EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {this.props.items &&
              this.props.items.map((tag: any) => (
                <EuiFlexItem key={`${tag.id}`}>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem>
                      <TagBadge
                        maxIdRenderSize={TABLE_CONFIG.TRUNCATE_TAG_LENGTH_SMALL}
                        onClick={() =>
                          this.props.actionHandler(AssignmentActionType.Assign, tag.id)
                        }
                        onClickAriaLabel={tag.id}
                        tag={tag}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
          </EuiFlexGroup>
        </EuiContextMenuPanel>
      </EuiPopover>
    );
  }
  private onButtonClick = async () => {
    this.props.actionHandler(AssignmentActionType.Reload);
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };
}
