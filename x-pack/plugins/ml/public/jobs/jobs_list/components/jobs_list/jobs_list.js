/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import { sortBy } from 'lodash';
import moment from 'moment';

import { toLocaleString } from '../../../../util/string_utils';
import { ResultLinks, actionsMenuContent } from '../job_actions';
import { JobDescription } from './job_description';
import { JobIcon } from '../job_message_icon';

import {
  EuiBasicTable,
  EuiButtonIcon,
} from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

class JobsListUI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobsSummaryList: props.jobsSummaryList,
      pageIndex: 0,
      pageSize: PAGE_SIZE,
      itemIdToExpandedRowMap: {},
      sortField: 'id',
      sortDirection: 'asc',
    };
  }

  static getDerivedStateFromProps(props) {
    const itemIdToExpandedRowMap = props.itemIdToExpandedRowMap;
    const jobsSummaryList = props.jobsSummaryList;
    return {
      itemIdToExpandedRowMap,
      jobsSummaryList
    };
  }

  onTableChange = ({ page = {}, sort = {} }) => {
    const {
      index: pageIndex,
      size: pageSize,
    } = page;

    const {
      field: sortField,
      direction: sortDirection,
    } = sort;

    this.setState({
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
    });
  };

  toggleRow = (item) => {
    this.props.toggleRow(item.id);
  };

  getPageOfJobs(index, size, sortField, sortDirection) {
    let list = this.state.jobsSummaryList;
    list = sortBy(this.state.jobsSummaryList, (item) => item[sortField]);
    list = (sortDirection === 'asc') ? list : list.reverse();
    const listLength = list.length;

    let pageStart = (index * size);
    if (pageStart >= listLength && (listLength !== 0)) {
      // if the page start is larger than the number of items due to
      // filters being applied or jobs being deleted, calculate a new page start
      pageStart = Math.floor((listLength - 1) / size) * size;
      // set the state out of the render cycle
      setTimeout(() => {
        this.setState({
          pageIndex: (pageStart / size)
        });
      }, 0);
    }
    return {
      pageOfItems: list.slice(pageStart, (pageStart + size)),
      totalItemCount: listLength,
    };
  }

  render() {
    const { intl, loading } = this.props;
    const selectionControls = {
      selectable: job => (job.deleting !== true),
      selectableMessage: (selectable) => (!selectable) ? intl.formatMessage({
        id: 'xpack.ml.jobsList.cannotSelectJobTooltip',
        defaultMessage: 'Cannot select job' })
        : undefined,
      onSelectionChange: this.props.selectJobChange
    };

    const columns = [
      {
        name: '',
        render: (item) => (
          <EuiButtonIcon
            onClick={() => this.toggleRow(item)}
            isDisabled={(item.deleting === true)}
            iconType={this.state.itemIdToExpandedRowMap[item.id] ? 'arrowDown' : 'arrowRight'}
            aria-label={this.state.itemIdToExpandedRowMap[item.id]
              ? intl.formatMessage({
                id: 'xpack.ml.jobsList.collapseJobDetailsAriaLabel',
                defaultMessage: 'Hide details for {itemId}' },
              { itemId: item.id }
              )
              : intl.formatMessage({
                id: 'xpack.ml.jobsList.expandJobDetailsAriaLabel',
                defaultMessage: 'Show details for {itemId}' },
              { itemId: item.id }
              )}
            data-row-id={item.id}
          />
        )
      }, {
        field: 'id',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.idLabel',
          defaultMessage: 'ID'
        }),
        sortable: true,
        truncateText: false,

      }, {
        field: 'auditMessage',
        name: '',
        render: (item) => (
          <JobIcon message={item} showTooltip={true} />
        )
      }, {
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.descriptionLabel',
          defaultMessage: 'Description'
        }),
        sortable: true,
        field: 'description',
        render: (description, item) => (
          <JobDescription job={item} />
        ),
        textOnly: true,
      }, {
        field: 'processed_record_count',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.processedRecordsLabel',
          defaultMessage: 'Processed records'
        }),
        sortable: true,
        truncateText: false,
        dataType: 'number',
        render: count => toLocaleString(count)
      }, {
        field: 'memory_status',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.memoryStatusLabel',
          defaultMessage: 'Memory status'
        }),
        sortable: true,
        truncateText: false,
      }, {
        field: 'jobState',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobStateLabel',
          defaultMessage: 'Job state'
        }),
        sortable: true,
        truncateText: false,
      }, {
        field: 'datafeedState',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.datafeedStateLabel',
          defaultMessage: 'Datafeed state'
        }),
        sortable: true,
        truncateText: false,
      }, {
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.latestTimestampLabel',
          defaultMessage: 'Latest timestamp'
        }),
        truncateText: false,
        field: 'latestTimestampSortValue',
        sortable: true,
        render: (time, item) => (
          <span className="euiTableCellContent__text">
            {
              (item.latestTimestampMs === undefined) ? '' : moment(item.latestTimestampMs).format(TIME_FORMAT)
            }
          </span>
        ),
        textOnly: true,
      }, {
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.actionsLabel',
          defaultMessage: 'Actions'
        }),
        render: (item) => (
          <ResultLinks jobs={[item]} />
        )
      }, {
        name: '',
        actions: actionsMenuContent(
          this.props.showEditJobFlyout,
          this.props.showDeleteJobModal,
          this.props.showStartDatafeedModal,
          this.props.refreshJobs,
        )
      }
    ];

    const {
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
    } = this.state;

    const {
      pageOfItems,
      totalItemCount,
    } = this.getPageOfJobs(pageIndex, pageSize, sortField, sortDirection);

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: PAGE_SIZE_OPTIONS
    };

    const sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    const selectedJobsClass = (this.props.selectedJobsCount) ? 'jobs-selected' : '';

    return (
      <EuiBasicTable
        data-test-subj="mlJobListTable"
        loading={loading === true}
        noItemsMessage={loading ?
          intl.formatMessage({
            id: 'xpack.ml.jobsList.loadingJobsLabel',
            defaultMessage: 'Loading jobs…'
          }) :
          intl.formatMessage({
            id: 'xpack.ml.jobsList.noJobsFoundLabel',
            defaultMessage: 'No jobs found'
          })
        }
        itemId="id"
        className={`jobs-list-table ${selectedJobsClass}`}
        items={pageOfItems}
        columns={columns}
        pagination={pagination}
        onChange={this.onTableChange}
        selection={selectionControls}
        itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
        isExpandable={true}
        sorting={sorting}
        hasActions={true}
      />
    );
  }
}
JobsListUI.propTypes = {
  jobsSummaryList: PropTypes.array.isRequired,
  fullJobsList: PropTypes.object.isRequired,
  itemIdToExpandedRowMap: PropTypes.object.isRequired,
  toggleRow: PropTypes.func.isRequired,
  selectJobChange: PropTypes.func.isRequired,
  showEditJobFlyout: PropTypes.func.isRequired,
  showDeleteJobModal: PropTypes.func.isRequired,
  showStartDatafeedModal: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
  selectedJobsCount: PropTypes.number.isRequired,
  loading: PropTypes.bool,
};
JobsListUI.defaultProps = {
  loading: false,
};

export const JobsList = injectI18n(JobsListUI);
