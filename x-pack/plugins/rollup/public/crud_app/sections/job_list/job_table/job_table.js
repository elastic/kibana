/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFieldSearch,
  EuiPage,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTitle,
  EuiPageBody,
  EuiPageContent,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';

import { JobStatus } from '../job_status';

const HEADERS = [{
  name: 'ID',
  fieldName: 'id',
}, {
  name: 'Status',
  fieldName: 'status',
  render: ({ status, rollupCron }) => {
    return (
      <EuiToolTip placement="top" content={`Cron: ${rollupCron}`}>
        <JobStatus status={status} />
      </EuiToolTip>
    );
  },
}, {
  name: 'Index pattern',
  fieldName: 'indexPattern',
}, {
  name: 'Rollup index',
  fieldName: 'rollupIndex',
}, {
  name: 'Delay',
  fieldName: 'rollupDelay',
}, {
  name: 'Interval',
  fieldName: 'rollupInterval',
}, {
  name: 'Groups',
  render: job => {
    const { histogram, terms } = job;
    const humanizedGroupNames = [];

    if (histogram) {
      humanizedGroupNames.push('histogram');
    }

    if (terms.fields.length) {
      humanizedGroupNames.push('terms');
    }

    if (humanizedGroupNames.length) {
      humanizedGroupNames[0] = humanizedGroupNames[0].replace(/^\w/, char => char.toUpperCase());
      return humanizedGroupNames.join(', ');
    }

    return 'None';
  },
}, {
  name: 'Metrics',
  render: job => {
    const { metrics } = job;
    return metrics.map(metric => metric.field).join(', ');
  },
}];

export class JobTable extends Component {
  constructor(props) {
    super(props);
  }

  static propTypes = {
    jobs: PropTypes.array,
  }

  static defaultProps = {
    jobs: [],
  }

  onSort = column => {
    const { sortField, isSortAscending, sortChanged } = this.props;

    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    sortChanged(column, newIsSortAscending);
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    return HEADERS.map(({ name, fieldName }) => {
      const isSorted = sortField === fieldName;

      return (
        <EuiTableHeaderCell
          key={name}
          onSort={fieldName ? () => this.onSort(fieldName) : undefined}
          isSorted={isSorted}
          isSortAscending={isSortAscending}
          data-test-subj={`jobTableHeaderCell-${name}`}
        >
          {name}
        </EuiTableHeaderCell>
      );
    });
  }

  buildRowCells(job) {
    const { openDetailPanel } = this.props;

    return HEADERS.map(({ name, fieldName, render }) => {
      const value = render ? render(job) : job[fieldName];
      let content;

      if (name === 'ID') {
        content = (
          <EuiLink
            data-test-subj="rollupTableJobLink"
            onClick={() => {
              openDetailPanel(job);
            }}
          >
            {value}
          </EuiLink>
        );
      } else {
        content = value;
      }

      return (
        <EuiTableRowCell
          key={`${job.id}-${name}`}
          truncateText={false}
          data-test-subj={`jobTableCell-${name}`}
        >
          {content}
        </EuiTableRowCell>
      );
    });
  }

  buildRows() {
    const { jobs } = this.props;

    return jobs.map(job => {
      return (
        <EuiTableRow
          key={`${job.id}-row`}
        >
          {this.buildRowCells(job)}
        </EuiTableRow>
      );
    });
  }

  renderPager() {
    const { pager, pageChanged, pageSizeChanged } = this.props;
    return (
      <EuiTablePagination
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={[10, 50, 100]}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={pageSizeChanged}
        onChangePage={pageChanged}
      />
    );
  }

  render() {
    const {
      filterChanged,
      filter,
      jobs
    } = this.props;

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiTitle size="l">
              <h1>Rollup jobs</h1>
            </EuiTitle>

            <EuiSpacer />

            <EuiFieldSearch
              fullWidth
              value={filter}
              onChange={event => {
                filterChanged(event.target.value);
              }}
              data-test-subj="jobTableFilterInput"
              placeholder="Search"
              aria-label="Search jobs"
            />

            <EuiSpacer size="m" />

            {jobs.length > 0 ? (
              <EuiTable>
                <EuiTableHeader>
                  {this.buildHeader()}
                </EuiTableHeader>

                <EuiTableBody>
                  {this.buildRows()}
                </EuiTableBody>
              </EuiTable>
            ) : (
              <div>
                No job rollup jobs to show
              </div>
            )}

            <EuiSpacer size="m" />

            {jobs.length > 0 ? this.renderPager() : null}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
