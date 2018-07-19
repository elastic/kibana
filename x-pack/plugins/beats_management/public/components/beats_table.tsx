/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiIcon,
  // @ts-ignore
  EuiInMemoryTable,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { CMPopulatedBeat } from '../../common/domain_types';

const columns = [
  {
    field: 'id',
    name: 'Beat name',
    render: (id: string) => <EuiLink>{id}</EuiLink>,
    sortable: true,
  },
  {
    field: 'type',
    name: 'Type',
    sortable: true,
  },
  {
    field: 'tags',
    name: 'Tags',
    render: (value: string, beat: CMPopulatedBeat) => (
      <EuiFlexGroup wrap responsive={false}>
        {beat.fullTags.map(tag => (
          <EuiBadge key={tag.id} color={tag.color ? tag.color : 'primary'}>
            {tag.id}
          </EuiBadge>
        ))}
      </EuiFlexGroup>
    ),
    sortable: true,
  },
  {
    // TODO: update to use actual metadata field
    field: 'event_rate',
    name: 'Event rate',
    sortable: true,
  },
  {
    // TODO: update to use actual metadata field
    field: 'last_updated',
    name: 'Last config update',
    sortable: true,
  },
];

interface BeatsTableProps {
  items: CMPopulatedBeat[];
  onBulkEdit: any;
  onBulkDelete: any;
  onBulkAssignTags: any;
}

interface BeatsTableState {
  pageIndex: number;
  pageSize: number;
  selection: CMPopulatedBeat[];
  isBulkPopoverOpen: boolean;
}

const TableContainer = styled.div`
  padding: 16px;
`;

export class BeatsTable extends React.Component<BeatsTableProps, BeatsTableState> {
  constructor(props: BeatsTableProps) {
    super(props);

    this.state = {
      pageIndex: 0,
      pageSize: 5,
      selection: [],
      isBulkPopoverOpen: false,
    };
  }

  public render() {
    const { items, onBulkEdit, onBulkDelete, onBulkAssignTags } = this.props;
    const { pageIndex, pageSize, isBulkPopoverOpen, selection } = this.state;

    const bulkActionButton = (
      <EuiButton iconSide="right" iconType="arrowDown" onClick={this.showBulkPopover}>
        Bulk Action
      </EuiButton>
    );

    const panels = [
      {
        id: 0,
        title: 'Bulk Action',
        items: [
          {
            name: 'Bulk Edit',
            icon: <EuiIcon type="indexEdit" size="m" />,
            onClick: () => onBulkEdit(selection),
          },
          {
            name: 'Bulk Delete',
            icon: <EuiIcon type="indexClose" size="m" />,
            onClick: () => onBulkDelete(selection),
          },
          {
            name: 'Bulk Assign Tags',
            icon: <EuiIcon type="gear" size="m" />,
            onClick: () => onBulkAssignTags(selection),
          },
        ],
      },
    ];

    const toolsLeft = (
      <EuiPopover
        id="contextMenu"
        button={bulkActionButton}
        isOpen={isBulkPopoverOpen}
        closePopover={this.hideBulkPopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    );

    const search = {
      box: { incremental: true },
      filters: [
        {
          type: 'field_value_selection',
          field: 'type',
          name: 'Type',
          multiSelect: true,
          options: items.map(({ type }) => {
            return {
              value: type,
              name: 'Type',
              view: type,
            };
          }),
        },
      ],
      toolsLeft,
    };

    const pagination = {
      initialPageSize: 5,
      pageIndex,
      pageSize,
      totalItemCount: items.length,
      pageSizeOptions: [3, 5, 8],
    };

    const selectionOptions = {
      onSelectionChange: this.setSelection,
      selectable: () => true,
      selectableMessage: () => null,
    };

    return (
      <TableContainer>
        <EuiInMemoryTable
          columns={columns}
          items={items.map((beat, index) => {
            return {
              ...beat,
              key: `beat${index}`,
            };
          })}
          itemId="id"
          isSelectable={true}
          pagination={pagination}
          responsive={true}
          search={search}
          selection={selectionOptions}
          sorting={true}
        />
      </TableContainer>
    );
  }

  private showBulkPopover = () => {
    const { isBulkPopoverOpen } = this.state;
    this.setState({
      isBulkPopoverOpen: !isBulkPopoverOpen,
    });
  };

  private hideBulkPopover = () => {
    this.setState({
      isBulkPopoverOpen: false,
    });
  };

  private setSelection = (selection: any) => {
    this.setState({
      selection,
    });
  };
}
