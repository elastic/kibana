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
  EuiButtonEmpty,
  EuiSearchBar,
} from '@elastic/eui';
import { sortByOrder } from 'lodash';
import { Paginate } from '../paginate';
import { TagList } from '../tag_list';
import { getTagsFilter } from '../../lib/get_tags_filter';
import { extractSearch } from '../../lib/extract_search';

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

  tagType = 'health';

  onTableChange = ({ sort = {} }) => {
    const { field: sortField, direction: sortDirection } = sort;
    this.setState({
      sortField,
      sortDirection,
    });
  };

  onSearch = ({ queryText }) => this.setState(extractSearch(queryText));

  cloneTemplate = template => this.props.cloneWorkpad(template).then(() => this.props.onClose());

  renderWorkpadTable = ({ rows, pageNumber, totalPages, setPage }) => {
    const { sortField, sortDirection } = this.state;

    const columns = [
      {
        field: 'name',
        name: 'Template name',
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
        render: tags => <TagList tags={tags} tagType={this.tagType} />,
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
    const { searchTerm } = this.state;
    const filters = [getTagsFilter(this.tagType)];

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
