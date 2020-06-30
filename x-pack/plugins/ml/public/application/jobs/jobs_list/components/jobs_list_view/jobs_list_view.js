/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { ml } from '../../../../services/ml_api_service';
import { checkForAutoStartDatafeed, filterJobs, loadFullJob } from '../utils';
import { JobsList } from '../jobs_list';
import { JobDetails } from '../job_details';
import { JobFilterBar } from '../job_filter_bar';
import { EditJobFlyout } from '../edit_job_flyout';
import { DeleteJobModal } from '../delete_job_modal';
import { StartDatafeedModal } from '../start_datafeed_modal';
import { CreateWatchFlyout } from '../create_watch_flyout';
import { MultiJobActions } from '../multi_job_actions';
import { NewJobButton } from '../new_job_button';
import { JobStatsBar } from '../jobs_stats_bar';
import { NodeAvailableWarning } from '../../../../components/node_available_warning';
import { DatePickerWrapper } from '../../../../components/navigation_menu/date_picker_wrapper';
import { UpgradeWarning } from '../../../../components/upgrade';
import { RefreshJobsListButton } from '../refresh_jobs_list_button';
import { isEqual } from 'lodash';

import { DELETING_JOBS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants/jobs_list';

let deletingJobsRefreshTimeout = null;

// 'isManagementTable' bool prop to determine when to configure table for use in Kibana management page
export class JobsListView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isRefreshing: false,
      loading: null,
      jobsSummaryList: [],
      filteredJobsSummaryList: [],
      fullJobsList: {},
      selectedJobs: [],
      itemIdToExpandedRowMap: {},
      filterClauses: [],
      deletingJobIds: [],
    };

    this.updateFunctions = {};

    this.showEditJobFlyout = () => {};
    this.showDeleteJobModal = () => {};
    this.showStartDatafeedModal = () => {};
    this.showCreateWatchFlyout = () => {};
  }

  componentDidMount() {
    this.refreshJobSummaryList(true);

    if (this.props.isManagementTable !== true) {
      // check to see if we need to open the start datafeed modal
      // after the page has rendered. This will happen if the user
      // has just created a job in the advanced wizard and selected to
      // start the datafeed now.
      this.openAutoStartDatafeedModal();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.lastRefresh !== this.props.lastRefresh) {
      this.refreshJobSummaryList();
    }
  }

  componentWillUnmount() {
    if (this.props.isManagementTable === undefined) {
      deletingJobsRefreshTimeout = null;
    }
  }

  openAutoStartDatafeedModal() {
    const job = checkForAutoStartDatafeed();
    if (job !== undefined) {
      this.showStartDatafeedModal([job]);
    }
  }

  toggleRow = (jobId) => {
    if (this.state.itemIdToExpandedRowMap[jobId]) {
      const itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
      delete itemIdToExpandedRowMap[jobId];
      this.setState({ itemIdToExpandedRowMap });
    } else {
      let itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };

      if (this.state.fullJobsList[jobId] !== undefined) {
        itemIdToExpandedRowMap[jobId] = (
          <JobDetails
            jobId={jobId}
            job={this.state.fullJobsList[jobId]}
            addYourself={this.addUpdateFunction}
            removeYourself={this.removeUpdateFunction}
            showFullDetails={this.props.isManagementTable !== true}
            refreshJobList={this.onRefreshClick}
          />
        );
      } else {
        itemIdToExpandedRowMap[jobId] = (
          <JobDetails
            jobId={jobId}
            addYourself={this.addUpdateFunction}
            removeYourself={this.removeUpdateFunction}
            showFullDetails={this.props.isManagementTable !== true}
            refreshJobList={this.onRefreshClick}
          />
        );
      }

      this.setState({ itemIdToExpandedRowMap }, () => {
        loadFullJob(jobId)
          .then((job) => {
            const fullJobsList = { ...this.state.fullJobsList };
            fullJobsList[jobId] = job;
            this.setState({ fullJobsList }, () => {
              // take a fresh copy of the itemIdToExpandedRowMap object
              itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
              if (itemIdToExpandedRowMap[jobId] !== undefined) {
                // wrap in a check, in case the user closes the expansion before the
                // loading has finished
                itemIdToExpandedRowMap[jobId] = (
                  <JobDetails
                    jobId={jobId}
                    job={job}
                    addYourself={this.addUpdateFunction}
                    removeYourself={this.removeUpdateFunction}
                    showFullDetails={this.props.isManagementTable !== true}
                    refreshJobList={this.onRefreshClick}
                  />
                );
              }
              this.setState({ itemIdToExpandedRowMap }, () => {
                this.updateFunctions[jobId](job);
              });
            });
          })
          .catch((error) => {
            console.error(error);
          });
      });
    }
  };

  addUpdateFunction = (id, f) => {
    this.updateFunctions[id] = f;
  };
  removeUpdateFunction = (id) => {
    delete this.updateFunctions[id];
  };

  setShowEditJobFlyoutFunction = (func) => {
    this.showEditJobFlyout = func;
  };
  unsetShowEditJobFlyoutFunction = () => {
    this.showEditJobFlyout = () => {};
  };

  setShowDeleteJobModalFunction = (func) => {
    this.showDeleteJobModal = func;
  };
  unsetShowDeleteJobModalFunction = () => {
    this.showDeleteJobModal = () => {};
  };

  setShowStartDatafeedModalFunction = (func) => {
    this.showStartDatafeedModal = func;
  };
  unsetShowStartDatafeedModalFunction = () => {
    this.showStartDatafeedModal = () => {};
  };

  setShowCreateWatchFlyoutFunction = (func) => {
    this.showCreateWatchFlyout = func;
  };
  unsetShowCreateWatchFlyoutFunction = () => {
    this.showCreateWatchFlyout = () => {};
  };
  getShowCreateWatchFlyoutFunction = () => {
    return this.showCreateWatchFlyout;
  };

  selectJobChange = (selectedJobs) => {
    this.setState({ selectedJobs });
  };

  refreshSelectedJobs() {
    const selectedJobsIds = this.state.selectedJobs.map((j) => j.id);
    const filteredJobIds = this.state.filteredJobsSummaryList.map((j) => j.id);

    // refresh the jobs stored as selected
    // only select those which are also in the filtered list
    const selectedJobs = this.state.jobsSummaryList
      .filter((j) => selectedJobsIds.find((id) => id === j.id))
      .filter((j) => filteredJobIds.find((id) => id === j.id));

    this.setState({ selectedJobs });
  }

  setFilters = (filterClauses) => {
    const filteredJobsSummaryList = filterJobs(this.state.jobsSummaryList, filterClauses);
    this.setState({ filteredJobsSummaryList, filterClauses }, () => {
      this.refreshSelectedJobs();
    });
  };

  onRefreshClick = () => {
    this.setState({ isRefreshing: true });
    this.refreshJobSummaryList(true);
  };
  isDoneRefreshing = () => {
    this.setState({ isRefreshing: false });
  };

  async refreshJobSummaryList(forceRefresh = false) {
    if (forceRefresh === true || this.props.blockRefresh !== true) {
      // Set loading to true for jobs_list table for initial job loading
      if (this.state.loading === null) {
        this.setState({ loading: true });
      }

      const expandedJobsIds = Object.keys(this.state.itemIdToExpandedRowMap);
      try {
        const jobs = await ml.jobs.jobsSummary(expandedJobsIds);
        const fullJobsList = {};
        const jobsSummaryList = jobs.map((job) => {
          if (job.fullJob !== undefined) {
            fullJobsList[job.id] = job.fullJob;
            delete job.fullJob;
          }
          job.latestTimestampSortValue = job.latestTimestampMs || 0;
          return job;
        });
        const filteredJobsSummaryList = filterJobs(jobsSummaryList, this.state.filterClauses);
        this.setState(
          { jobsSummaryList, filteredJobsSummaryList, fullJobsList, loading: false },
          () => {
            this.refreshSelectedJobs();
          }
        );

        Object.keys(this.updateFunctions).forEach((j) => {
          this.updateFunctions[j](fullJobsList[j]);
        });

        jobs.forEach((job) => {
          if (job.deleting && this.state.itemIdToExpandedRowMap[job.id]) {
            this.toggleRow(job.id);
          }
        });

        this.isDoneRefreshing();
        if (jobsSummaryList.some((j) => j.deleting === true)) {
          // if there are some jobs in a deleting state, start polling for
          // deleting jobs so we can update the jobs list once the
          // deleting tasks are over
          this.checkDeletingJobTasks(forceRefresh);
        }
      } catch (error) {
        console.error(error);
        this.setState({ loading: false });
      }
    }
  }

  async checkDeletingJobTasks(forceRefresh = false) {
    const { jobIds: taskJobIds } = await ml.jobs.deletingJobTasks();

    const taskListHasChanged =
      isEqual(taskJobIds.sort(), this.state.deletingJobIds.sort()) === false;

    this.setState({
      deletingJobIds: taskJobIds,
    });

    // only reload the jobs list if the contents of the task list has changed
    // or the check refresh has been forced i.e. from a user action
    if (taskListHasChanged || forceRefresh) {
      this.refreshJobSummaryList();
    }

    if (taskJobIds.length > 0 && deletingJobsRefreshTimeout === null) {
      deletingJobsRefreshTimeout = setTimeout(() => {
        deletingJobsRefreshTimeout = null;
        this.checkDeletingJobTasks();
      }, DELETING_JOBS_REFRESH_INTERVAL_MS);
    }
  }

  renderManagementJobsListComponents() {
    const {
      isRefreshing,
      loading,
      itemIdToExpandedRowMap,
      jobsSummaryList,
      filteredJobsSummaryList,
      fullJobsList,
      selectedJobs,
    } = this.state;
    return (
      <div className="job-management" data-test-subj="ml-jobs-list">
        <NodeAvailableWarning />
        <UpgradeWarning />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <JobStatsBar jobsSummaryList={jobsSummaryList} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <RefreshJobsListButton
                  onRefreshClick={this.onRefreshClick}
                  isRefreshing={isRefreshing}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <div className="managementJobsList">
          <div>
            <JobFilterBar setFilters={this.setFilters} />
          </div>
          <JobsList
            jobsSummaryList={filteredJobsSummaryList}
            fullJobsList={fullJobsList}
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            toggleRow={this.toggleRow}
            selectJobChange={this.selectJobChange}
            selectedJobsCount={selectedJobs.length}
            loading={loading}
            isManagementTable={true}
            isMlEnabledInSpace={this.props.isMlEnabledInSpace}
          />
        </div>
      </div>
    );
  }

  renderJobsListComponents() {
    const { isRefreshing, loading, jobsSummaryList } = this.state;
    const jobIds = jobsSummaryList.map((j) => j.id);

    return (
      <EuiPage data-test-subj="ml-jobs-list">
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.jobsList.title"
                    defaultMessage="Anomaly detection jobs"
                  />
                </h1>
              </EuiTitle>
            </EuiPageHeaderSection>
            <EuiPageHeaderSection>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <RefreshJobsListButton
                    onRefreshClick={this.onRefreshClick}
                    isRefreshing={isRefreshing}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <DatePickerWrapper />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageHeaderSection>
          </EuiPageHeader>

          <NodeAvailableWarning />

          <UpgradeWarning />

          <EuiPageContent>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <JobStatsBar jobsSummaryList={jobsSummaryList} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <NewJobButton />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <div>
              <div className="actions-bar">
                <MultiJobActions
                  selectedJobs={this.state.selectedJobs}
                  allJobIds={jobIds}
                  showStartDatafeedModal={this.showStartDatafeedModal}
                  showDeleteJobModal={this.showDeleteJobModal}
                  refreshJobs={() => this.refreshJobSummaryList(true)}
                />
                <JobFilterBar setFilters={this.setFilters} />
              </div>
              <JobsList
                jobsSummaryList={this.state.filteredJobsSummaryList}
                fullJobsList={this.state.fullJobsList}
                itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
                toggleRow={this.toggleRow}
                selectJobChange={this.selectJobChange}
                showEditJobFlyout={this.showEditJobFlyout}
                showDeleteJobModal={this.showDeleteJobModal}
                showStartDatafeedModal={this.showStartDatafeedModal}
                refreshJobs={() => this.refreshJobSummaryList(true)}
                selectedJobsCount={this.state.selectedJobs.length}
                loading={loading}
              />
              <EditJobFlyout
                setShowFunction={this.setShowEditJobFlyoutFunction}
                unsetShowFunction={this.unsetShowEditJobFlyoutFunction}
                refreshJobs={() => this.refreshJobSummaryList(true)}
                allJobIds={jobIds}
              />
              <DeleteJobModal
                setShowFunction={this.setShowDeleteJobModalFunction}
                unsetShowFunction={this.unsetShowDeleteJobModalFunction}
                refreshJobs={() => this.refreshJobSummaryList(true)}
              />
              <StartDatafeedModal
                setShowFunction={this.setShowStartDatafeedModalFunction}
                unsetShowFunction={this.unsetShowDeleteJobModalFunction}
                getShowCreateWatchFlyoutFunction={this.getShowCreateWatchFlyoutFunction}
                refreshJobs={() => this.refreshJobSummaryList(true)}
              />
              <CreateWatchFlyout
                setShowFunction={this.setShowCreateWatchFlyoutFunction}
                unsetShowFunction={this.unsetShowCreateWatchFlyoutFunction}
              />
            </div>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  render() {
    const { isManagementTable } = this.props;

    return (
      <div>
        {!isManagementTable
          ? this.renderJobsListComponents()
          : this.renderManagementJobsListComponents()}
      </div>
    );
  }
}
