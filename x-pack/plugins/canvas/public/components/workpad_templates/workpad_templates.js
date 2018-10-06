/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiButtonIcon,
  EuiPagination,
  EuiSpacer,
  EuiToolTip,
  EuiHealth,
  EuiButtonEmpty,
  EuiSearchBar,
} from '@elastic/eui';
import { sortByOrder } from 'lodash';
import { palettes } from '@elastic/eui/lib/services';
import { getId } from '../../lib/get_id';
import { Paginate } from '../paginate';
import { templates } from './templates';

const uniqueTags = templates
  .reduce((acc, { tags = [] }) => {
    tags.forEach(tag => {
      if (acc.indexOf(tag) === -1) acc.push(tag);
    });
    return acc;
  }, [])
  .sort();

const { colors } = palettes.euiPaletteColorBlind;

const tagColorMapping = uniqueTags.reduce((acc, tag, i) => {
  acc[tag] = colors[i % colors.length];
  return acc;
}, {});

export class WorkpadTemplates extends React.PureComponent {
  static propTypes = {
    cloneWorkpad: PropTypes.func.isRequired,
  };

  state = {
    sortField: '@timestamp',
    sortDirection: 'desc',
    pageSize: 10,
    searchTerm: '',
    filterTags: [],
  };

  onTableChange = ({ sort = {} }) => {
    const { field: sortField, direction: sortDirection } = sort;
    this.setState({
      sortField,
      sortDirection,
    });
  };

  onSearch = ({ query, searchTerm = '' }) => {
    // extracts tags from the query AST
    const filterTags = query.ast._clauses.reduce((acc, clause) => {
      const { field, value } = clause;
      if (field === 'tags') acc.push(value);
      return acc;
    }, []);

    this.setState({ searchTerm, filterTags });
  };

  renderWorkpadTable = ({ rows, pageNumber, totalPages, setPage }) => {
    const { cloneWorkpad } = this.props;
    const { sortField, sortDirection } = this.state;

    const actions = [
      {
        render: workpad => (
          <EuiToolTip content="Clone">
            <EuiButtonIcon
              iconType="copy"
              onClick={() => cloneWorkpad(workpad)}
              aria-label="Clone Workpad"
            />
          </EuiToolTip>
        ),
      },
    ];

    const columns = [
      {
        field: 'name',
        name: 'Workpad Name',
        sortable: true,
        width: '30%',
        dataType: 'string',
        render: (name, workpad) => {
          const workpadName = workpad.name.length ? workpad.name : <em>{workpad.id}</em>;

          return (
            <EuiButtonEmpty
              onClick={() => cloneWorkpad(workpad)}
              aria-label={`Clone workpad template ${workpadName}`}
              type="link"
            >
              {workpadName}
            </EuiButtonEmpty>
          );
        },
      },
      {
        field: 'description',
        name: 'description',
        sortable: false,
        dataType: 'string',
        width: '30%',
      },
      {
        field: 'tags',
        name: 'Tags',
        sortable: false,
        dataType: 'string',
        width: '30%',
        render: tags => {
          if (!tags) return 'No tags';
          return tags.map(tag => (
            <EuiHealth key={getId('tag')} color={tagColorMapping[tag]}>
              {tag}
            </EuiHealth>
          ));
        },
      },
      { name: '', actions, width: '10%' },
    ];

    const sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    return (
      <Fragment>
        <EuiBasicTable
          compressed
          items={rows}
          itemId="id"
          columns={columns}
          sorting={sorting}
          onChange={this.onTableChange}
          className="canvasWorkpad__dropzoneTable"
        />
        <EuiSpacer />
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiPagination activePage={pageNumber} onPageClick={setPage} pageCount={totalPages} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  };

  renderSearch = () => {
    const { searchTerm } = this.state;

    const schema = {
      strict: true,
      fields: {
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        tag: {
          type: 'string',
          validate: value => {
            if (!uniqueTags.some(tag => tag.name === value)) {
              throw new Error(
                `Unknown tag (possible values: ${uniqueTags.map(tag => tag.name).join(',')})`
              );
            }
          },
        },
      },
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'tags',
        name: 'Tags',
        multiSelect: true,
        options: uniqueTags.map(tag => ({
          value: tag,
          name: tag,
          view: (
            <EuiHealth key={getId('tag')} color={tagColorMapping[tag]}>
              {tag}
            </EuiHealth>
          ),
        })),
      },
    ];

    return (
      <EuiSearchBar
        query={searchTerm}
        box={{
          placeholder: 'Find template',
          incremental: true,
          schema,
        }}
        filters={filters}
        onChange={this.onSearch}
      />
    );
  };

  render() {
    const { sortField, sortDirection, searchTerm, filterTags } = this.state;

    const sortedTemplates = sortByOrder(
      templates,
      [sortField, '@timestamp'],
      [sortDirection, 'desc']
    );

    const filteredTemplates = sortedTemplates.filter(({ name, description, tags }) => {
      const tagMatch = filterTags.length
        ? filterTags.some(filterTag => tags.indexOf(filterTag) > -1)
        : true;
      const textMatch = searchTerm
        ? name.includes(searchTerm) || description.includes(searchTerm)
        : true;

      return tagMatch && textMatch;
    });

    return (
      <Paginate rows={filteredTemplates}>
        {pagination => (
          <Fragment>
            <EuiSpacer />
            {this.renderSearch()}
            <EuiSpacer />
            {this.renderWorkpadTable(pagination)}
          </Fragment>
        )}
      </Paginate>
    );
  }
}
