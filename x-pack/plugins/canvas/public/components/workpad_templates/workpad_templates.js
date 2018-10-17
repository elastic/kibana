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
import { get, sortByOrder } from 'lodash';
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
  .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

const { colors } = palettes.euiPaletteColorBlind;

const tagColorMapping = uniqueTags.reduce((acc, tag, i) => {
  acc[tag] = colors[i % Object.keys(colors).length];
  return acc;
}, {});

export class WorkpadTemplates extends React.PureComponent {
  static propTypes = {
    cloneWorkpad: PropTypes.func.isRequired,
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
      if (type === 'term') searchTerms.push(value);
      // extracts tags from the query AST
      else if (field === 'tags') filterTags.push(value);
    });

    this.setState({ searchTerm: searchTerms.join(' '), filterTags });
  };

  cloneTemplate = template => this.props.cloneWorkpad(template).then(() => this.props.onClose());

  renderWorkpadTable = ({ rows, pageNumber, totalPages, setPage }) => {
    const { sortField, sortDirection } = this.state;

    const actions = [
      {
        render: template => (
          <EuiToolTip content="Clone">
            <EuiButtonIcon
              iconType="copy"
              onClick={() => this.cloneTemplate(template)}
              aria-label={`Clone Template "${template.name}"`}
            />
          </EuiToolTip>
        ),
      },
    ];

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
        field: 'description',
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
        defaultQuery={searchTerm}
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
    const sortedTemplates = sortByOrder(templates, [sortField, 'name'], [sortDirection, 'asc']);

    const filteredTemplates = sortedTemplates.filter(
      ({ name = '', description = '', tags = [] }) => {
        const tagMatch = filterTags.length
          ? filterTags.some(filterTag => tags.indexOf(filterTag) > -1)
          : true;

        const lowercaseSearch = searchTerm.toLowerCase();
        const textMatch = lowercaseSearch
          ? name.toLowerCase().indexOf(lowercaseSearch) > -1 ||
            description.toLowerCase().indexOf(lowercaseSearch) > -1
          : true;

        return tagMatch && textMatch;
      }
    );

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
