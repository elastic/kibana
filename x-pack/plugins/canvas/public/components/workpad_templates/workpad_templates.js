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
  EuiPagination,
  EuiSpacer,
  EuiHealth,
  EuiButtonEmpty,
  EuiSearchBar,
} from '@elastic/eui';
import { get, sortByOrder } from 'lodash';
import { getId } from '../../lib/get_id';
import { Paginate } from '../paginate';

export class WorkpadTemplates extends React.PureComponent {
  static propTypes = {
    cloneWorkpad: PropTypes.func.isRequired,
    templates: PropTypes.object,
    uniqueTags: PropTypes.object,
  };

  state = {
    sortField: 'name',
    sortDirection: 'asc',
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

  onSearch = ({ query }) => {
    const clauses = get(query, 'ast._clauses', []);

    const filterTags = [];
    const searchTerms = [];

    clauses.forEach(clause => {
      const { type, field, value } = clause;
      // extract terms from the query AST
      if (type === 'term') {
        searchTerms.push(value);
      }
      // extracts tags from the query AST
      else if (field === 'tags') {
        filterTags.push(value);
      }
    });

    this.setState({ searchTerm: searchTerms.join(' '), filterTags });
  };

  cloneTemplate = template => this.props.cloneWorkpad(template).then(() => this.props.onClose());

  renderWorkpadTable = ({ rows, pageNumber, totalPages, setPage }) => {
    const { uniqueTags } = this.props;
    const { sortField, sortDirection } = this.state;

    const columns = [
      {
        field: 'name',
        name: 'Template Name',
        sortable: true,
        width: '30%',
        dataType: 'string',
        render: (name, template) => {
          const templateName = template.name.length ? template.name : <em>{template.id}</em>;

          return (
            <EuiButtonEmpty
              onClick={() => this.cloneTemplate(template)}
              aria-label={`Clone workpad template "${templateName}"`}
              type="link"
            >
              {templateName}
            </EuiButtonEmpty>
          );
        },
      },
      {
        field: 'help',
        name: 'Description',
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
          if (!tags) {
            return 'No tags';
          }
          return tags.map(tag => (
            <EuiHealth key={getId('tag')} color={get(uniqueTags, `${tag}.color`, '#666666')}>
              {tag}
            </EuiHealth>
          ));
        },
      },
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
          className="canvasWorkpad__dropzoneTable canvasWorkpad__dropzoneTable--tags"
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
    let { uniqueTags } = this.props;
    const { searchTerm } = this.state;

    uniqueTags = Object.values(uniqueTags);

    const filters = [
      {
        type: 'field_value_selection',
        field: 'tags',
        name: 'Tags',
        multiSelect: true,
        options: uniqueTags.map(({ name, color }) => ({
          value: name,
          name: name,
          view: (
            <EuiHealth key={getId('tag')} color={color}>
              {name}
            </EuiHealth>
          ),
        })),
      },
    ];

    return (
      <EuiSearchBar
        defaultQuery={searchTerm}
        box={{
          placeholder: 'Find template',
          incremental: true,
        }}
        filters={filters}
        onChange={this.onSearch}
      />
    );
  };

  render() {
    const { templates } = this.props;
    const { sortField, sortDirection, searchTerm, filterTags } = this.state;
    const sortedTemplates = sortByOrder(templates, [sortField, 'name'], [sortDirection, 'asc']);

    const filteredTemplates = sortedTemplates.filter(({ name = '', help = '', tags = [] }) => {
      const tagMatch = filterTags.length
        ? filterTags.every(filterTag => tags.indexOf(filterTag) > -1)
        : true;

      const lowercaseSearch = searchTerm.toLowerCase();
      const textMatch = lowercaseSearch
        ? name.toLowerCase().indexOf(lowercaseSearch) > -1 ||
          help.toLowerCase().indexOf(lowercaseSearch) > -1
        : true;

      return tagMatch && textMatch;
    });

    return (
      <Paginate rows={filteredTemplates}>
        {pagination => (
          <Fragment>
            {this.renderSearch()}
            <EuiSpacer />
            {this.renderWorkpadTable(pagination)}
          </Fragment>
        )}
      </Paginate>
    );
  }
}
