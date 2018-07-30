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

import { toLocaleString } from '../../../../util/string_utils';
import { ResultLinks, actionsMenuContent } from '../job_actions';
import { JobDescription } from './job_description';
import { JobIcon } from '../job_message_icon';
import './styles/main.less';

import {
  EuiBasicTable,
  EuiButtonIcon,
} from '@elastic/eui';

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export class JobsList extends Component {
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

    let pageStart = (index * size);
    if (pageStart >= list.length) {
      // if the page start is larger than the number of items
      // due to filters being applied, calculate a new page start
      pageStart = Math.floor(list.length / size) * size;
      // set the state out of the render cycle
      setTimeout(() => {
        this.setState({
          pageIndex: (pageStart / size)
        });
      }, 0);
    }
    return {
      pageOfItems: list.slice(pageStart, (pageStart + size)),
      totalItemCount: list.length,
    };
  }

  render() {
    const selectionControls = {
      selectable: () => true,
      selectableMessage: (selectable) => (!selectable) ? 'Cannot select job' : undefined,
      onSelectionChange: this.props.selectJobChange
    };

    const columns = [
      {
        name: '',
        render: (item) => (
          <EuiButtonIcon
            onClick={() => this.toggleRow(item)}
            iconType={this.state.itemIdToExpandedRowMap[item.id] ? 'arrowDown' : 'arrowRight'}
            aria-label={this.state.itemIdToExpandedRowMap[item.id] ? 'Hide details' : 'Show details'}
            data-row-id={item.id}
          />
        )
      }, {
        field: 'id',
        name: 'ID',
        sortable: true,
        truncateText: false,

      }, {
        field: 'auditMessage',
        name: '',
        render: (item) => (
          <JobIcon message={item} showTooltip={true} />
        )
      }, {
        name: 'Description',
        sortable: true,
        field: 'description',
        render: (description, item) => (
          <JobDescription job={item} />
        )
      }, {
        field: 'processed_record_count',
        name: 'Processed records',
        sortable: true,
        truncateText: false,
        dataType: 'number',
        render: count => toLocaleString(count)
      }, {
        field: 'memory_status',
        name: 'Memory status',
        sortable: true,
        truncateText: false,
      }, {
        field: 'jobState',
        name: 'Job state',
        sortable: true,
        truncateText: false,
      }, {
        field: 'datafeedState',
        name: 'Datafeed state',
        sortable: true,
        truncateText: false,
      }, {
        name: 'Latest timestamp',
        truncateText: false,
        field: 'latestTimeStampUnix',
        sortable: true,
        render: (time, item) => (
          <span className="euiTableCellContent__text">
            { item.latestTimeStamp.string }
          </span>
        )
      }, {
        name: 'Actions',
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
JobsList.propTypes = {
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
};
