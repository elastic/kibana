/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component
} from 'react';

// import { JobDetails } from '../job_details';
import './styles/main.less';

import {
  EuiInMemoryTable,
  EuiButtonIcon,
} from '@elastic/eui';

export class JobsList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobsSummaryList: props.jobsSummaryList,
      pageIndex: 0,
      pageSize: 5,
      selection: [],
      itemIdToExpandedRowMap: {}
    };
  }

  static getDerivedStateFromProps(props) {
    const itemIdToExpandedRowMap = props.itemIdToExpandedRowMap;
    return { itemIdToExpandedRowMap };
  }

  // onTableChange = ({ page = {} }) => {
  //   const {
  //     index: pageIndex,
  //     size: pageSize,
  //   } = page;

  //   this.setState({
  //     pageIndex,
  //     pageSize,
  //   });
  // };
  toggleRow = (item) => {
    this.props.toggleRow(item.id);
    // const itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
    // if (itemIdToExpandedRowMap[item.id]) {
    //   delete itemIdToExpandedRowMap[item.id];
    // } else {
    //   itemIdToExpandedRowMap[item.id] = (
    //     <JobDetails jobId={item.id} />
    //   );
    // }
    // this.setState({ itemIdToExpandedRowMap });


  };

  render() {
    const selectionControls = {
      selectable: () => true,
      selectableMessage: (selectable) => (!selectable) ? 'Cannot select job' : undefined,
      onSelectionChange: (selection) => this.setState({ selection })
    };
    // const {
    //   pageIndex,
    //   pageSize,
    //   jobsSummaryList
    // } = this.state;

    // const pagedJobsSummary = this.props.jobsSummaryList;
    const { jobsSummaryList } = this.props;

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
        truncateText: true,
        hideForMobile: true,
      }, {
        field: 'description',
        name: 'Description',
        truncateText: true,
        hideForMobile: true,
      }, {
        field: 'processed_record_count',
        name: 'Processed records',
        truncateText: true,
        hideForMobile: true,
      }, {
        field: 'memory_status',
        name: 'Memory status',
        truncateText: true,
        hideForMobile: true,
      }, {
        field: 'jobState',
        name: 'Job state',
        truncateText: true,
        hideForMobile: true,
      }, {
        field: 'datafeedState',
        name: 'Datafeed state',
        truncateText: true,
        hideForMobile: true,
      }, {
        field: 'latestTimeStamp',
        name: 'Latest timestamp',
        truncateText: true,
        hideForMobile: true,
      }
    ];

    // const pagination = {
    //   pageIndex: pageIndex,
    //   pageSize: pageSize,
    //   totalItemCount: jobsSummaryList.length,
    //   pageSizeOptions: [3, 5, 8]
    // };

    return (
      <EuiInMemoryTable
        className="jobs-list-table"
        items={jobsSummaryList}
        columns={columns}
        pagination={true}
        itemId="id"
        selection={selectionControls}
        itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
        isExpandable={true}
      />
    );
  }
}
