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
  EuiIcon,
  EuiPopover,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import React from 'react';
import { TABLE_CONFIG } from '../../../common/constants';

interface BulkActionControlBarState {
  isPopoverVisible: boolean;
}

interface FilterOption {
  value: string;
}

interface BulkActionControlBarProps {
  onBulkAction: any;
  onSearchQueryChange: any;
  tagOptions: FilterOption[];
  typeOptions: FilterOption[];
}

export class BulkActionControlBar extends React.Component<
  BulkActionControlBarProps,
  BulkActionControlBarState
> {
  constructor(props: BulkActionControlBarProps) {
    super(props);

    this.state = {
      isPopoverVisible: false,
    };
  }

  public render() {
    const { isPopoverVisible } = this.state;

    const bulkActionButton = (
      <EuiButton iconSide="right" iconType="arrowDown" onClick={this.showPopover}>
        Bulk Action
      </EuiButton>
    );
    const { onSearchQueryChange, tagOptions, typeOptions } = this.props;
    const panels = [
      {
        id: 0,
        title: 'Bulk Action',
        items: [
          {
            name: 'Bulk Edit',
            icon: <EuiIcon type="indexEdit" size="m" />,
            onClick: this.getActionHandler(TABLE_CONFIG.ACTIONS.BULK_EDIT),
          },
          {
            name: 'Bulk Delete',
            icon: <EuiIcon type="indexClose" size="m" />,
            onClick: this.getActionHandler(TABLE_CONFIG.ACTIONS.BULK_DELETE),
          },
          {
            name: 'Bulk Assign Tags',
            icon: <EuiIcon type="gear" size="m" />,
            onClick: this.getActionHandler(TABLE_CONFIG.ACTIONS.BULK_ASSIGN_TAG),
          },
        ],
      },
    ];

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiPopover
            anchorPosition="downLeft"
            button={bulkActionButton}
            closePopover={this.hidePopover}
            id="contextMenu"
            isOpen={isPopoverVisible}
            panelPaddingSize="none"
            withTitle
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSearchBar
            box={{
              incremental: true,
            }}
            filters={[
              {
                type: 'field_value_selection',
                field: 'type',
                name: 'Type',
                options: typeOptions,
              },
              {
                type: 'field_value_selection',
                field: 'tag',
                name: 'Tags',
                options: tagOptions,
              },
            ]}
            onChange={onSearchQueryChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private hidePopover = () => {
    this.setState({
      isPopoverVisible: false,
    });
  };

  private getActionHandler = (action: string) => () => this.props.onBulkAction(action);

  private showPopover = () => {
    this.setState({
      isPopoverVisible: true,
    });
  };
}
