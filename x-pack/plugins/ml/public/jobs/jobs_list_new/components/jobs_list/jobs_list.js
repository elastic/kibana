/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

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
      itemIdToExpandedRowMap: {}
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

  onTableChange = ({ page = {} }) => {
    const {
      index: pageIndex,
      size: pageSize,
    } = page;

    this.setState({
      pageIndex,
      pageSize,
    });
  };

  toggleRow = (item) => {
    this.props.toggleRow(item.id);
  };

  getPageOfJobs(index, size) {
    const list = this.state.jobsSummaryList;
    const pageStart = (index * size);
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
        truncateText: false,

      }, {
        field: 'auditMessage',
        name: '',
        render: (item) => (
          <JobIcon message={item} showTooltip={true} />
        )
      }, {
        name: 'Description',
        render: (item) => (
          <JobDescription job={item} />
        )
      }, {
        field: 'processed_record_count',
        name: 'Processed records',
        truncateText: false,
      }, {
        field: 'memory_status',
        name: 'Memory status',
        truncateText: false,
      }, {
        field: 'jobState',
        name: 'Job state',
        truncateText: false,
      }, {
        field: 'datafeedState',
        name: 'Datafeed state',
        truncateText: false,
      }, {
        name: 'Latest timestamp',
        truncateText: false,
        render: (item) => (
          <span className="euiTableCellContent__text">
            { item.latestTimeStamp.string }
          </span>
        ),
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
    } = this.state;

    const {
      pageOfItems,
      totalItemCount,
    } = this.getPageOfJobs(pageIndex, pageSize);

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: PAGE_SIZE_OPTIONS
    };

    return (
      <EuiBasicTable
        itemId="id"
        className="jobs-list-table"
        items={pageOfItems}
        columns={columns}
        pagination={pagination}
        onChange={this.onTableChange}
        selection={selectionControls}
        itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
        isExpandable={true}
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
};
