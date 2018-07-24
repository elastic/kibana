/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiBadge,
  EuiFlexGroup,
  // @ts-ignore
  EuiInMemoryTable,
  EuiLink,
} from '@elastic/eui';
import { flatten, uniq } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { BulkActionControlBar } from './controls';

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
    field: 'full_tags',
    name: 'Tags',
    render: (value: string, beat: CMPopulatedBeat) => (
      <EuiFlexGroup wrap responsive={false}>
        {beat.full_tags.map(tag => (
          <EuiBadge key={tag.id} color={tag.color ? tag.color : 'primary'}>
            {tag.id}
          </EuiBadge>
        ))}
      </EuiFlexGroup>
    ),
    sortable: false,
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
  onBulkAction: any;
}

interface BeatsTableState {
  itemsToRender: CMPopulatedBeat[];
  pageIndex: number;
  pageSize: number;
  search?: any;
  selection: CMPopulatedBeat[];
}

const TableContainer = styled.div`
  padding: 16px;
`;

export class BeatsTable extends React.Component<BeatsTableProps, BeatsTableState> {
  constructor(props: BeatsTableProps) {
    super(props);

    this.state = {
      itemsToRender: props.items,
      pageIndex: 0,
      pageSize: 5,
      selection: [],
    };
  }

  public render() {
    const { onBulkAction } = this.props;
    const { itemsToRender, pageIndex, pageSize } = this.state;

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount: itemsToRender.length,
      pageSizeOptions: [3, 5, 8],
    };

    const selectionOptions = {
      onSelectionChange: this.setSelection,
      selectable: () => true,
      selectableMessage: () => null,
    };

    const tagOptions = this.getTagsOptions();
    const typeOptions = this.getTypeOptions();

    return (
      <TableContainer>
        <BulkActionControlBar
          onBulkAction={(action: string) => {
            const { selection } = this.state;
            onBulkAction(action, selection);
          }}
          onSearchQueryChange={this.onQueryChange}
          tagOptions={tagOptions}
          typeOptions={typeOptions}
        />
        <EuiInMemoryTable
          columns={columns}
          items={itemsToRender}
          itemId="id"
          isSelectable={true}
          pagination={pagination}
          selection={selectionOptions}
          sorting={true}
        />
      </TableContainer>
    );
  }

  private getClauseValuesForField = (ast: any, fieldName: string) => {
    const clauses = ast.getFieldClauses(fieldName);
    return clauses ? clauses.map((clause: any) => clause.value) : [];
  };

  private onQueryChange = (search: any) => {
    const { items } = this.props;
    let itemsToRender = items;

    if (search && !search.error) {
      const { query } = search;
      const types = this.getClauseValuesForField(query.ast, 'type');
      const tags = this.getClauseValuesForField(query.ast, 'tag');
      const terms = query.ast.getTermClauses().map((clause: any) => clause.value);
      if (types.length) {
        itemsToRender = itemsToRender.filter(item => types.includes(item.type));
      }
      if (tags.length) {
        itemsToRender = itemsToRender.filter(item =>
          item.full_tags.some(({ id }) => tags.includes(id))
        );
      }
      if (terms.length) {
        itemsToRender = itemsToRender.filter(item =>
          terms.some((term: string) => item.id.includes(term))
        );
      }
    }

    this.setState({
      itemsToRender,
    });
  };

  private getTagsOptions = () => {
    const { items } = this.props;
    const ids = flatten(items.map(({ full_tags }) => full_tags.map(({ id }) => id)));
    return uniq(ids).map(id => ({
      value: id,
    }));
  };

  private getTypeOptions = () => {
    const { items } = this.props;
    return uniq(items.map(({ type }) => type)).map(type => ({ value: type }));
  };

  private setSelection = (selection: any) => {
    this.setState({
      selection,
    });
  };
}
