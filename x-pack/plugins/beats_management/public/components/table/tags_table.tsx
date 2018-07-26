/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiBadge,
  // @ts-ignore
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import { TABLE_CONFIG } from '../../../common/constants';
import { BeatTag, ConfigurationBlock } from '../../../common/domain_types';
import { TagActionControlBar } from './tag_action_control_bar';

interface TagsTableProps {
  onAddTag: any;
  onDeleteTags: any;
  tags: BeatTag[];
}

interface TagsTableState {
  selection: BeatTag[];
  search: any;
}

const truncateText = (text: string) =>
  text.length > TABLE_CONFIG.TRUNCATE_TAG_LENGTH
    ? `${text.substring(0, TABLE_CONFIG.TRUNCATE_TAG_LENGTH)}...`
    : text;

const columns = [
  {
    field: 'id',
    name: 'Tag name',
    render: (id: string, tag: BeatTag) => (
      <EuiBadge color={tag.color ? tag.color : 'primary'}>{truncateText(tag.id)}</EuiBadge>
    ),
    sortable: true,
    width: '70%',
  },
  {
    align: 'right',
    field: 'configuration_blocks',
    name: 'Configurations',
    render: (configurationBlocks: ConfigurationBlock[]) => <div>{configurationBlocks.length}</div>,
    sortable: false,
  },
  {
    align: 'right',
    field: 'last_updated',
    name: 'Last update',
    render: (lastUpdate: Date) => <div>{moment(lastUpdate).fromNow()}</div>,
    sortable: true,
  },
];

const TableContainer = styled.div`
  padding: 16px;
`;

export class TagsTable extends React.Component<TagsTableProps, TagsTableState> {
  constructor(props: TagsTableProps) {
    super(props);

    this.state = {
      selection: [],
      search: null,
    };
  }

  public render() {
    const { onAddTag } = this.props;
    const { selection } = this.state;

    const pagination = {
      initialPageSize: TABLE_CONFIG.INITIAL_ROW_SIZE,
      pageSizeOptions: TABLE_CONFIG.PAGE_SIZE_OPTIONS,
    };

    const selectionOptions = {
      onSelectionChange: this.setSelection,
      selectable: () => true,
      selectableMessage: () => 'Select this tag',
    };

    return (
      <TableContainer>
        <TagActionControlBar
          isDeleteDisabled={selection.length === 0}
          onAddTag={onAddTag}
          onDeleteSelected={this.onDeleteSelected}
          onSearchQueryChange={this.onSearchQueryChange}
        />
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          columns={columns}
          isSelectable={true}
          items={this.getTagsToRender()}
          itemId="id"
          pagination={pagination}
          selection={selectionOptions}
          sorting={true}
        />
      </TableContainer>
    );
  }

  private getTagsToRender() {
    const { search } = this.state;
    let tagsToRender = this.props.tags;
    if (search && !search.error && search.query.ast.getTermClauses().length) {
      const { ast } = search.query;
      const terms = ast.getTermClauses().map((clause: any) => clause.value);
      tagsToRender = tagsToRender.filter(tag =>
        terms.some((term: string) => tag.id.toLowerCase().includes(term.toLowerCase()))
      );
    }
    return tagsToRender;
  }

  private setSelection = (selection: any) => {
    this.setState({
      selection,
    });
  };

  private onDeleteSelected = () => {
    const { selection } = this.state;
    const { onDeleteTags } = this.props;
    onDeleteTags(selection);
  };

  private onSearchQueryChange = (search: any) => {
    this.setState({
      search,
    });
  };
}
