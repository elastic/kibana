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

// TODO: move to constants
const BULK_ASSIGN_TAG = 'BULK_ASSIGN_TAG';
const BULK_DELETE = 'BULK_DELETE';
const BULK_EDIT = 'BULK_EDIT';

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
    const { onBulkAction, onSearchQueryChange, tagOptions, typeOptions } = this.props;
    const panels = [
      {
        id: 0,
        title: 'Bulk Action',
        items: [
          {
            name: 'Bulk Edit',
            icon: <EuiIcon type="indexEdit" size="m" />,
            onClick: () => onBulkAction(BULK_EDIT),
          },
          {
            name: 'Bulk Delete',
            icon: <EuiIcon type="indexClose" size="m" />,
            onClick: () => onBulkAction(BULK_DELETE),
          },
          {
            name: 'Bulk Assign Tags',
            icon: <EuiIcon type="gear" size="m" />,
            onClick: () => onBulkAction(BULK_ASSIGN_TAG),
          },
        ],
      },
    ];

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="contextMenu"
            button={bulkActionButton}
            isOpen={isPopoverVisible}
            closePopover={this.hidePopover}
            panelPaddingSize="none"
            withTitle
            anchorPosition="downLeft"
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

  private showPopover = () => {
    this.setState({
      isPopoverVisible: true,
    });
  };

  private hidePopover = () => {
    this.setState({
      isPopoverVisible: false,
    });
  };
}
