/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { sortBy } from 'lodash';
import moment from 'moment';

import { toLocaleString } from '../../../../util/string_utils';
import { ResultLinks, actionsMenuContent } from '../job_actions';
import { JobDescription } from './job_description';
import { JobIcon } from '../../../../components/job_message_icon';
import { MLSavedObjectsSpacesList } from '../../../../components/ml_saved_objects_spaces_list';
import { TIME_FORMAT } from '../../../../../../common/constants/time_format';

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiToolTip,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AnomalyDetectionJobIdLink } from './job_id_link';
import { isManagedJob } from '../../../jobs_utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// 'isManagementTable' bool prop to determine when to configure table for use in Kibana management page
export class JobsList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobsSummaryList: props.jobsSummaryList,
      itemIdToExpandedRowMap: {},
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

    this.props.onJobsViewStateUpdate({
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

    return <AnomalyDetectionJobIdLink key={id} id={id} />;
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
        this.props.onJobsViewStateUpdate({
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
    const { loading, isManagementTable, spacesApi } = this.props;
    const selectionControls = {
      selectable: (job) => job.blocked === undefined,
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
    // The version of the table used in ML > Job Management depends on many EUI class overrides that set the width explicitly.
    // The ML > Job Management table won't change as the overwritten class styles take precedence, though these values may need to
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
            isDisabled={item.blocked !== undefined}
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
        width: '15%',
        scope: 'row',
        render: isManagementTable
          ? (id) => this.getJobIdLink(id)
          : (id, item) => {
              if (!isManagedJob(item)) return id;

              return (
                <>
                  <span>
                    {id} &nbsp;
                    <EuiToolTip
                      content={i18n.translate('xpack.ml.jobsList.managedBadgeTooltip', {
                        defaultMessage:
                          'This job is preconfigured and managed by Elastic; other parts of the product might have might have dependencies on its behavior.',
                      })}
                    >
                      <EuiBadge color="hollow" data-test-subj="mlJobListRowManagedLabel" size="xs">
                        {i18n.translate('xpack.ml.jobsList.managedBadgeLabel', {
                          defaultMessage: 'Managed',
                        })}
                      </EuiBadge>
                    </EuiToolTip>
                  </span>
                </>
              );
            },
      },
      {
        field: 'auditMessage',
        name: (
          <EuiScreenReaderOnly>
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.auditMessageColumn.screenReaderDescription"
                defaultMessage="This column displays icons when there are errors or warnings for the job in the past 24 hours"
              />
            </p>
          </EuiScreenReaderOnly>
        ),
        render: (item) => <JobIcon message={item} showTooltip={true} />,
      },
      {
        field: 'alertingRules',
        name: (
          <EuiScreenReaderOnly>
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.alertingRules.screenReaderDescription"
                defaultMessage="This column displays icons when there are alert rules associated with a job"
              />
            </p>
          </EuiScreenReaderOnly>
        ),
        width: '30px',
        render: (item) => {
          return Array.isArray(item) ? (
            <EuiToolTip
              position="bottom"
              content={
                <FormattedMessage
                  id="xpack.ml.jobsList.alertingRules.tooltipContent"
                  defaultMessage="Job has {rulesCount} associated alert {rulesCount, plural, one { rule} other { rules}}"
                  values={{ rulesCount: item.length }}
                />
              }
            >
              <EuiIcon type="bell" />
            </EuiToolTip>
          ) : (
            <span />
          );
        },
      },
      {
        name: i18n.translate('xpack.ml.jobsList.descriptionLabel', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        field: 'description',
        'data-test-subj': 'mlJobListColumnDescription',
        render: (description, item) => (
          <JobDescription job={item} isManagementTable={isManagementTable} />
        ),
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
        width: '8%',
      },
    ];

    if (isManagementTable === true) {
      if (spacesApi) {
        // insert before last column
        columns.splice(columns.length - 1, 0, {
          name: i18n.translate('xpack.ml.jobsList.spacesLabel', {
            defaultMessage: 'Spaces',
          }),
          render: (item) => (
            <MLSavedObjectsSpacesList
              spacesApi={spacesApi}
              spaceIds={item.spaceIds}
              id={item.id}
              mlSavedObjectType="anomaly-detector"
              refresh={this.props.refreshJobs}
            />
          ),
          'data-test-subj': 'mlJobListColumnSpaces',
        });
      }
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
          this.props.showResetJobModal,
          this.props.showStartDatafeedModal,
          this.props.showCloseJobsConfirmModal,
          this.props.showStopDatafeedsConfirmModal,
          this.props.refreshJobs,
          this.props.showCreateAlertFlyout
        ),
        width: '40px',
      });
    }

    const { pageIndex, pageSize, sortField, sortDirection } = this.props.jobsViewState;

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
  showCloseJobsConfirmModal: PropTypes.func,
  showCreateAlertFlyout: PropTypes.func,
  showStopDatafeedsConfirmModal: PropTypes.func,
  refreshJobs: PropTypes.func,
  selectedJobsCount: PropTypes.number.isRequired,
  loading: PropTypes.bool,
  jobsViewState: PropTypes.object,
  onJobsViewStateUpdate: PropTypes.func,
};
JobsList.defaultProps = {
  isManagementTable: false,
  isMlEnabledInSpace: true,
  loading: false,
};
