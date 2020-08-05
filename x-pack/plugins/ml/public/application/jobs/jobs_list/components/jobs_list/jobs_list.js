/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { sortBy } from 'lodash';
import moment from 'moment';

import { toLocaleString } from '../../../../util/string_utils';
import { ResultLinks, actionsMenuContent } from '../job_actions';
import { JobDescription } from './job_description';
import { JobIcon } from '../../../../components/job_message_icon';
import { getJobIdUrl } from '../../../../util/get_job_id_url';
import { TIME_FORMAT } from '../../../../../../common/constants/time_format';

import { EuiBadge, EuiBasicTable, EuiButtonIcon, EuiLink, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// 'isManagementTable' bool prop to determine when to configure table for use in Kibana management page
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
      jobsSummaryList,
    };
  }

  onTableChange = ({ page = {}, sort = {} }) => {
    const { index: pageIndex, size: pageSize } = page;

    const { field: sortField, direction: sortDirection } = sort;

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

  getJobIdLink(id) {
    // Don't allow link to job if ML is not enabled in current space
    if (this.props.isMlEnabledInSpace === false) {
      return id;
    }

    return <EuiLink href={getJobIdUrl('jobs', id)}>{id}</EuiLink>;
  }

  getPageOfJobs(index, size, sortField, sortDirection) {
    let list = this.state.jobsSummaryList;
    list = sortBy(this.state.jobsSummaryList, (item) => item[sortField]);
    list = sortDirection === 'asc' ? list : list.reverse();
    const listLength = list.length;

    let pageStart = index * size;
    if (pageStart >= listLength && listLength !== 0) {
      // if the page start is larger than the number of items due to
      // filters being applied or jobs being deleted, calculate a new page start
      pageStart = Math.floor((listLength - 1) / size) * size;
      // set the state out of the render cycle
      setTimeout(() => {
        this.setState({
          pageIndex: pageStart / size,
        });
      }, 0);
    }
    return {
      pageOfItems: list.slice(pageStart, pageStart + size),
      totalItemCount: listLength,
    };
  }

  render() {
    const { loading, isManagementTable } = this.props;
    const selectionControls = {
      selectable: (job) => job.deleting !== true,
      selectableMessage: (selectable, rowItem) =>
        selectable === false
          ? i18n.translate('xpack.ml.jobsList.cannotSelectRowForJobMessage', {
              defaultMessage: 'Cannot select job ID {jobId}',
              values: {
                jobId: rowItem.id,
              },
            })
          : i18n.translate('xpack.ml.jobsList.selectRowForJobMessage', {
              defaultMessage: 'Select the row for job ID {jobId}',
              values: {
                jobId: rowItem.id,
              },
            }),
      onSelectionChange: this.props.selectJobChange,
    };
    // Adding 'width' props to columns for use in the Kibana management jobs list table
    // The version of the table used in ML > Job Managment depends on many EUI class overrides that set the width explicitly.
    // The ML > Job Managment table won't change as the overwritten class styles take precedence, though these values may need to
    // be updated if we move to always using props for width.
    const columns = [
      {
        name: (
          <EuiScreenReaderOnly>
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.showDetailsColumn.screenReaderDescription"
                defaultMessage="This column contains clickable controls for showing more details on each job"
              />
            </p>
          </EuiScreenReaderOnly>
        ),
        render: (item) => (
          <EuiButtonIcon
            onClick={() => this.toggleRow(item)}
            isDisabled={item.deleting === true}
            iconType={this.state.itemIdToExpandedRowMap[item.id] ? 'arrowDown' : 'arrowRight'}
            aria-label={
              this.state.itemIdToExpandedRowMap[item.id]
                ? i18n.translate('xpack.ml.jobsList.collapseJobDetailsAriaLabel', {
                    defaultMessage: 'Hide details for {itemId}',
                    values: { itemId: item.id },
                  })
                : i18n.translate('xpack.ml.jobsList.expandJobDetailsAriaLabel', {
                    defaultMessage: 'Show details for {itemId}',
                    values: { itemId: item.id },
                  })
            }
            data-row-id={item.id}
            data-test-subj="mlJobListRowDetailsToggle"
          />
        ),
        width: '3%',
      },
      {
        field: 'id',
        'data-test-subj': 'mlJobListColumnId',
        name: i18n.translate('xpack.ml.jobsList.idLabel', {
          defaultMessage: 'ID',
        }),
        sortable: true,
        truncateText: false,
        width: '20%',
        scope: 'row',
        render: isManagementTable ? (id) => this.getJobIdLink(id) : undefined,
      },
      {
        field: 'auditMessage',
        name: (
          <EuiScreenReaderOnly>
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.auditMessageColumn.screenReaderDescription"
                defaultMessage="This column display icons when there are errors or warnings for the job in the past 24 hours"
              />
            </p>
          </EuiScreenReaderOnly>
        ),
        render: (item) => <JobIcon message={item} showTooltip={true} />,
      },
      {
        name: i18n.translate('xpack.ml.jobsList.descriptionLabel', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        field: 'description',
        'data-test-subj': 'mlJobListColumnDescription',
        render: (description, item) => <JobDescription job={item} />,
        textOnly: true,
        width: '20%',
      },
      {
        field: 'processed_record_count',
        'data-test-subj': 'mlJobListColumnRecordCount',
        name: i18n.translate('xpack.ml.jobsList.processedRecordsLabel', {
          defaultMessage: 'Processed records',
        }),
        sortable: true,
        truncateText: false,
        dataType: 'number',
        render: (count) => toLocaleString(count),
        width: '10%',
      },
      {
        field: 'memory_status',
        'data-test-subj': 'mlJobListColumnMemoryStatus',
        name: i18n.translate('xpack.ml.jobsList.memoryStatusLabel', {
          defaultMessage: 'Memory status',
        }),
        sortable: true,
        truncateText: false,
        width: '5%',
      },
      {
        field: 'jobState',
        'data-test-subj': 'mlJobListColumnJobState',
        name: i18n.translate('xpack.ml.jobsList.jobStateLabel', {
          defaultMessage: 'Job state',
        }),
        sortable: true,
        truncateText: false,
        width: '8%',
      },
      {
        field: 'datafeedState',
        'data-test-subj': 'mlJobListColumnDatafeedState',
        name: i18n.translate('xpack.ml.jobsList.datafeedStateLabel', {
          defaultMessage: 'Datafeed state',
        }),
        sortable: true,
        truncateText: false,
        width: '8%',
      },
      {
        name: i18n.translate('xpack.ml.jobsList.actionsLabel', {
          defaultMessage: 'Actions',
        }),
        render: (item) => <ResultLinks jobs={[item]} />,
      },
    ];

    if (isManagementTable === true) {
      // insert before last column
      columns.splice(columns.length - 1, 0, {
        name: i18n.translate('xpack.ml.jobsList.spacesLabel', {
          defaultMessage: 'Spaces',
        }),
        render: () => <EuiBadge color={'hollow'}>{'all'}</EuiBadge>,
      });
      // Remove actions if Ml not enabled in current space
      if (this.props.isMlEnabledInSpace === false) {
        columns.pop();
      }
    } else {
      // insert before last column
      columns.splice(columns.length - 1, 0, {
        name: i18n.translate('xpack.ml.jobsList.latestTimestampLabel', {
          defaultMessage: 'Latest timestamp',
        }),
        truncateText: false,
        field: 'latestTimestampSortValue',
        'data-test-subj': 'mlJobListColumnLatestTimestamp',
        sortable: true,
        render: (time, item) => (
          <span className="euiTableCellContent__text">
            {item.latestTimestampMs === undefined
              ? ''
              : moment(item.latestTimestampMs).format(TIME_FORMAT)}
          </span>
        ),
        textOnly: true,
        width: '15%',
      });
      columns.push({
        name: (
          <EuiScreenReaderOnly>
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.jobActionsColumn.screenReaderDescription"
                defaultMessage="This column contains extra actions in a menu that can be performed on each job"
              />
            </p>
          </EuiScreenReaderOnly>
        ),
        actions: actionsMenuContent(
          this.props.showEditJobFlyout,
          this.props.showDeleteJobModal,
          this.props.showStartDatafeedModal,
          this.props.refreshJobs
        ),
      });
    }

    const { pageIndex, pageSize, sortField, sortDirection } = this.state;

    const { pageOfItems, totalItemCount } = this.getPageOfJobs(
      pageIndex,
      pageSize,
      sortField,
      sortDirection
    );

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    };

    const sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    const selectedJobsClass = this.props.selectedJobsCount ? 'jobs-selected' : '';

    return (
      <EuiBasicTable
        data-test-subj={loading ? 'mlJobListTable loading' : 'mlJobListTable loaded'}
        loading={loading === true}
        noItemsMessage={
          loading
            ? i18n.translate('xpack.ml.jobsList.loadingJobsLabel', {
                defaultMessage: 'Loading jobs…',
              })
            : i18n.translate('xpack.ml.jobsList.noJobsFoundLabel', {
                defaultMessage: 'No jobs found',
              })
        }
        itemId="id"
        className={`jobs-list-table ${selectedJobsClass}`}
        items={pageOfItems}
        columns={columns}
        pagination={pagination}
        onChange={this.onTableChange}
        selection={isManagementTable ? undefined : selectionControls}
        itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
        isExpandable={true}
        sorting={sorting}
        hasActions={true}
        rowProps={(item) => ({
          'data-test-subj': `mlJobListRow row-${item.id}`,
        })}
      />
    );
  }
}
JobsList.propTypes = {
  jobsSummaryList: PropTypes.array.isRequired,
  fullJobsList: PropTypes.object.isRequired,
  isManagementTable: PropTypes.bool,
  isMlEnabledInSpace: PropTypes.bool,
  itemIdToExpandedRowMap: PropTypes.object.isRequired,
  toggleRow: PropTypes.func.isRequired,
  selectJobChange: PropTypes.func.isRequired,
  showEditJobFlyout: PropTypes.func,
  showDeleteJobModal: PropTypes.func,
  showStartDatafeedModal: PropTypes.func,
  refreshJobs: PropTypes.func,
  selectedJobsCount: PropTypes.number.isRequired,
  loading: PropTypes.bool,
};
JobsList.defaultProps = {
  isManagementTable: false,
  isMlEnabledInSpace: true,
  loading: false,
};
