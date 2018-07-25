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
import { TABLE_CONFIG } from '../../../common/constants';
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
      <EuiFlexGroup wrap responsive={true}>
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
      selection: [],
    };
  }

  public render() {
    const { itemsToRender } = this.state;

    const pagination = {
      initialPageSize: TABLE_CONFIG.INITIAL_ROW_SIZE,
      pageSizeOptions: TABLE_CONFIG.PAGE_SIZE_OPTIONS,
    };

    const selectionOptions = {
      onSelectionChange: this.setSelection,
      selectable: () => true,
      selectableMessage: () => 'Select this beat',
    };

    const tagOptions = this.getTagsOptions();
    const typeOptions = this.getTypeOptions();

    return (
      <TableContainer>
        <BulkActionControlBar
          onBulkAction={this.handleBulkAction}
          onSearchQueryChange={this.onSearchQueryChange}
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

  private handleBulkAction = (action: string) => {
    const { onBulkAction } = this.props;
    const { selection } = this.state;
    onBulkAction(action, selection);
  };

  private onSearchQueryChange = (search: any) => {
    const { items } = this.props;
    let itemsToRender = items;

    if (search && !search.error) {
      const { ast } = search.query;
      const types = this.getClauseValuesForField(ast, 'type');
      const tags = this.getClauseValuesForField(ast, 'tag');
      const terms = ast.getTermClauses().map((clause: any) => clause.value);
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
    const fullTags = flatten(items.map(item => item.full_tags));
    return uniq(fullTags.map(tag => ({ value: tag.id })), 'value');
  };

  private getTypeOptions = () => {
    const { items } = this.props;
    return uniq(items.map(({ type }) => ({ value: type })), 'value');
  };

  private setSelection = (selection: any) => {
    this.setState({
      selection,
    });
  };
}
