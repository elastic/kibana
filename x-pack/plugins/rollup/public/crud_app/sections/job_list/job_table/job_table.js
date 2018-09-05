/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n }  from '@kbn/i18n';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiToolTip,
} from '@elastic/eui';

import { JobActionMenu } from '../../components';

import { JobStatus } from '../job_status';

const COLUMNS = [{
  name: i18n.translate('xpack.rollupJobs.jobTable.headers.nameHeader', {
    defaultMessage: 'ID',
  }),
  fieldName: 'id',
}, {
  name: i18n.translate('xpack.rollupJobs.jobTable.headers.statusHeader', {
    defaultMessage: 'Status',
  }),
  fieldName: 'status',
  render: ({ status, rollupCron }) => {
    return (
      <EuiToolTip placement="top" content={`Cron: ${rollupCron}`}>
        <JobStatus status={status} />
      </EuiToolTip>
    );
  },
}, {
  name: i18n.translate('xpack.rollupJobs.jobTable.headers.indexPatternHeader', {
    defaultMessage: 'Index pattern',
  }),
  truncateText: true,
  fieldName: 'indexPattern',
}, {
  name: i18n.translate('xpack.rollupJobs.jobTable.headers.rollupIndexHeader', {
    defaultMessage: 'Rollup index',
  }),
  truncateText: true,
  fieldName: 'rollupIndex',
}, {
  name: i18n.translate('xpack.rollupJobs.jobTable.headers.delayHeader', {
    defaultMessage: 'Delay',
  }),
  fieldName: 'dateHistogramDelay',
  render: ({ dateHistogramDelay }) => dateHistogramDelay || 'None',
}, {
  name: i18n.translate('xpack.rollupJobs.jobTable.headers.intervalHeader', {
    defaultMessage: 'Interval',
  }),
  fieldName: 'dateHistogramInterval',
}, {
  name: i18n.translate('xpack.rollupJobs.jobTable.headers.groupsHeader', {
    defaultMessage: 'Groups',
  }),
  truncateText: true,
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
  name: i18n.translate('xpack.rollupJobs.jobTable.headers.metricsHeader', {
    defaultMessage: 'Metrics',
  }),
  truncateText: true,
  render: job => {
    const { metrics } = job;
    return metrics.map(metric => metric.field).join(', ');
  },
}];

export class JobTableUi extends Component {
  static propTypes = {
    jobs: PropTypes.array,
    pager: PropTypes.object.isRequired,
    filter: PropTypes.string.isRequired,
    sortField: PropTypes.string.isRequired,
    isSortAscending: PropTypes.bool.isRequired,
    closeDetailPanel: PropTypes.func.isRequired,
    filterChanged: PropTypes.func.isRequired,
    pageChanged: PropTypes.func.isRequired,
    pageSizeChanged: PropTypes.func.isRequired,
    sortChanged: PropTypes.func.isRequired,
    dispatch: PropTypes.func.isRequired,
  }

  static defaultProps = {
    jobs: [],
  }

  static getDerivedStateFromProps(props, state) {
    // Deselct any jobs which no longer exist, e.g. they've been deleted.
    const { idToSelectedJobMap } = state;
    const jobIds = props.jobs.map(job => job.id);
    const selectedJobIds = Object.keys(idToSelectedJobMap);
    const missingJobIds = selectedJobIds.filter(selectedJobId => {
      return !jobIds.includes(selectedJobId);
    });

    if (missingJobIds.length) {
      const newMap = { ...idToSelectedJobMap };
      missingJobIds.forEach(missingJobId => delete newMap[missingJobId]);
      return { idToSelectedJobMap: newMap };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      idToSelectedJobMap: {},
    };
  }

  toggleAll = () => {
    const allSelected = this.areAllItemsSelected();

    if (allSelected) {
      return this.setState({ idToSelectedJobMap: {} });
    }

    const { jobs } = this.props;
    const idToSelectedJobMap = {};

    jobs.forEach(({ id }) => {
      idToSelectedJobMap[id] = true;
    });

    this.setState({ idToSelectedJobMap });
  };

  toggleItem = id => {
    this.setState(({ idToSelectedJobMap }) => {
      const newMap = { ...idToSelectedJobMap };

      if (newMap[id]) {
        delete newMap[id];
      } else {
        newMap[id] = true;
      }

      return { idToSelectedJobMap: newMap };
    });
  };

  resetSelection = () => {
    this.setState({ idToSelectedJobMap: {} });
  };

  deselectItems = (itemIds) => {
    this.setState(({ idToSelectedJobMap }) => {
      const newMap = { ...idToSelectedJobMap };
      itemIds.forEach(id => delete newMap[id]);
      return { idToSelectedJobMap: newMap };
    });
  };

  areAllItemsSelected = () => {
    const { jobs } = this.props;
    const indexOfUnselectedItem = jobs.findIndex(
      job => !this.isItemSelected(job.id)
    );
    return indexOfUnselectedItem === -1;
  };

  isItemSelected = id => {
    return !!this.state.idToSelectedJobMap[id];
  };

  getSelectedJobs() {
    const { jobs } = this.props;
    const { idToSelectedJobMap } = this.state;
    return Object.keys(idToSelectedJobMap).map(jobId => {
      return jobs.find(job => job.id === jobId);
    });
  }

  onSort = column => {
    const { sortField, isSortAscending, sortChanged } = this.props;

    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    sortChanged(column, newIsSortAscending);
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    return COLUMNS.map(({ name, fieldName }) => {
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

    return COLUMNS.map(({ name, fieldName, render, truncateText }) => {
      const value = render ? render(job) : job[fieldName];
      let content;

      if (name === 'ID') {
        content = (
          <EuiLink
            data-test-subj="rollupTableJobLink"
            onClick={() => {
              openDetailPanel(job.id);
            }}
          >
            {value}
          </EuiLink>
        );
      } else {
        content = <span>{value}</span>;
      }

      let wrappedContent;

      if (truncateText) {
        wrappedContent = (
          <EuiToolTip content={value}>
            {content}
          </EuiToolTip>
        );
      } else {
        wrappedContent = content;
      }

      return (
        <EuiTableRowCell
          key={`${job.id}-${name}`}
          data-test-subj={`jobTableCell-${name}`}
          truncateText={truncateText}
        >
          {wrappedContent}
        </EuiTableRowCell>
      );
    });
  }

  buildRows() {
    const { jobs } = this.props;

    return jobs.map(job => {
      const { id } = job;

      return (
        <EuiTableRow
          key={`${id}-row`}
        >
          <EuiTableRowCellCheckbox key={`checkbox-${id}`}>
            <EuiCheckbox
              type="inList"
              id={`checkboxSelectIndex-${id}`}
              checked={this.isItemSelected(id)}
              onChange={() => {
                this.toggleItem(id);
              }}
              data-test-subj="indexTableRowCheckbox"
            />
          </EuiTableRowCellCheckbox>

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
      jobs,
      intl,
      closeDetailPanel,
    } = this.props;

    const { idToSelectedJobMap } = this.state;

    const atLeastOneItemSelected = Object.keys(idToSelectedJobMap).length > 0;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          {atLeastOneItemSelected ? (
            <EuiFlexItem grow={false}>
              <JobActionMenu
                jobs={this.getSelectedJobs()}
                closeDetailPanel={closeDetailPanel}
                resetSelection={this.resetSelection}
                deselectJobs={this.deselectItems}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              value={filter}
              onChange={event => {
                filterChanged(event.target.value);
              }}
              data-test-subj="jobTableFilterInput"
              placeholder={
                intl.formatMessage({
                  id: 'xpack.rollupJobs.jobTable.searchInputPlaceholder',
                  defaultMessage: 'Search',
                })
              }
              aria-label="Search jobs"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {jobs.length > 0 ? (
          <EuiTable>
            <EuiTableHeader>
              <EuiTableHeaderCellCheckbox>
                <EuiCheckbox
                  id="selectAllJobsCheckbox"
                  checked={this.areAllItemsSelected()}
                  onChange={this.toggleAll}
                  type="inList"
                />
              </EuiTableHeaderCellCheckbox>
              {this.buildHeader()}
            </EuiTableHeader>

            <EuiTableBody>
              {this.buildRows()}
            </EuiTableBody>
          </EuiTable>
        ) : (
          <div>
            No rollup jobs to show
          </div>
        )}

        <EuiSpacer size="m" />

        {jobs.length > 0 ? this.renderPager() : null}
      </Fragment>
    );
  }
}

export const JobTable = injectI18n(JobTableUi);
