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
  EuiTableSortingType,
  Direction,
  SortDirection,
} from '@elastic/eui';
import { orderBy } from 'lodash';
// @ts-ignore untyped local
import { EuiBasicTableColumn } from '@elastic/eui';
import { Paginate, PaginateChildProps } from '../paginate';
import { TagList } from '../tag_list';
import { getTagsFilter } from '../../lib/get_tags_filter';
// @ts-expect-error
import { extractSearch } from '../../lib/extract_search';
import { ComponentStrings } from '../../../i18n';
import { CanvasTemplate } from '../../../types';

interface TableChange<T> {
  page?: {
    index: number;
    size: number;
  };
  sort?: {
    field: keyof T;
    direction: Direction;
  };
}

const { WorkpadTemplates: strings } = ComponentStrings;

interface WorkpadTemplatesProps {
  onCreateFromTemplate: (template: CanvasTemplate) => Promise<void>;
  onClose: () => void;
  templates: Record<string, CanvasTemplate>;
}

interface WorkpadTemplatesState {
  sortField: string;
  sortDirection: Direction;
  pageSize: number;
  searchTerm: string;
  filterTags: string[];
}

export class WorkpadTemplates extends React.PureComponent<
  WorkpadTemplatesProps,
  WorkpadTemplatesState
> {
  static propTypes = {
    onCreateFromTemplate: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    templates: PropTypes.object,
  };

  state = {
    sortField: 'name',
    sortDirection: SortDirection.ASC,
    pageSize: 10,
    searchTerm: '',
    filterTags: [],
  };

  tagType: 'health' = 'health';

  onTableChange = (tableChange: TableChange<CanvasTemplate>) => {
    if (tableChange.sort) {
      const { field: sortField, direction: sortDirection } = tableChange.sort;
      this.setState({
        sortField,
        sortDirection,
      });
    }
  };

  onSearch = ({ queryText = '' }) => this.setState(extractSearch(queryText));

  cloneTemplate = (template: CanvasTemplate) =>
    this.props.onCreateFromTemplate(template).then(() => this.props.onClose());

  renderWorkpadTable = ({ rows, pageNumber, totalPages, setPage }: PaginateChildProps) => {
    const { sortField, sortDirection } = this.state;

    const columns: Array<EuiBasicTableColumn<CanvasTemplate>> = [
      {
        field: 'name',
        name: strings.getTableNameColumnTitle(),
        sortable: true,
        width: '30%',
        dataType: 'string',
        render: (name: string, template) => {
          const templateName = name.length ? name : 'Unnamed Template';

          return (
            <EuiButtonEmpty
              onClick={() => this.cloneTemplate(template)}
              aria-label={strings.getCloneTemplateLinkAriaLabel(templateName)}
              type="button"
            >
              {templateName}
            </EuiButtonEmpty>
          );
        },
      },
      {
        field: 'help',
        name: strings.getTableDescriptionColumnTitle(),
        sortable: false,
        dataType: 'string',
        width: '30%',
      },
      {
        field: 'tags',
        name: strings.getTableTagsColumnTitle(),
        sortable: false,
        dataType: 'string',
        width: '30%',
        render: (tags: string[]) => <TagList tags={tags} tagType={this.tagType} />,
      },
    ];

    const sorting: EuiTableSortingType<any> = {
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
        {rows.length > 0 && (
          <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiPagination activePage={pageNumber} onPageClick={setPage} pageCount={totalPages} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
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
          placeholder: strings.getTemplateSearchPlaceholder(),
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
    const sortedTemplates = orderBy(templates, [sortField, 'name'], [sortDirection, 'asc']);

    const filteredTemplates = sortedTemplates.filter(({ name = '', help = '', tags = [] }) => {
      const tagMatch = filterTags.length
        ? filterTags.every((filterTag) => tags.indexOf(filterTag) > -1)
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
        {(pagination: PaginateChildProps) => (
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
