/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { ml } from '../../../../services/ml_api_service';
import { checkForAutoStartDatafeed, filterJobs, loadFullJob } from '../utils';
import { JobsList } from '../jobs_list';
import { JobDetails } from '../job_details';
import { JobFilterBar } from '../job_filter_bar';
import { EditJobFlyout } from '../edit_job_flyout';
import { JobListDatafeedChartFlyout } from '../datafeed_chart_flyout';
import { DeleteJobModal } from '../delete_job_modal';
import { ResetJobModal } from '../reset_job_modal';
import { StartDatafeedModal } from '../start_datafeed_modal';
import { MultiJobActions } from '../multi_job_actions';
import { NewJobButton } from '../new_job_button';
import { JobStatsBar } from '../jobs_stats_bar';
import { NodeAvailableWarning } from '../../../../components/node_available_warning';
import { JobsAwaitingNodeWarning } from '../../../../components/jobs_awaiting_node_warning';
import { SavedObjectsWarning } from '../../../../components/saved_objects_warning';
import { UpgradeWarning } from '../../../../components/upgrade';

import { DELETING_JOBS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants/jobs_list';
import { JobListMlAnomalyAlertFlyout } from '../../../../../alerting/ml_alerting_flyout';
import { StopDatafeedsConfirmModal } from '../confirm_modals/stop_datafeeds_confirm_modal';
import { CloseJobsConfirmModal } from '../confirm_modals/close_jobs_confirm_modal';
import { AnomalyDetectionEmptyState } from '../anomaly_detection_empty_state';

let blockingJobsRefreshTimeout = null;

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
      blockingJobIds: [],
      jobsAwaitingNodeCount: 0,
    };

    this.updateFunctions = {};

    this.showEditJobFlyout = () => {};
    this.showDatafeedChartFlyout = () => {};
    this.showStopDatafeedsConfirmModal = () => {};
    this.showCloseJobsConfirmModal = () => {};
    this.showDeleteJobModal = () => {};
    this.showResetJobModal = () => {};
    this.showStartDatafeedModal = () => {};
    this.showCreateAlertFlyout = () => {};
    // work around to keep track of whether the component is mounted
    // used to block timeouts for results polling
    // which can run after unmounting
    this._isMounted = false;
    /**
     * Indicates if the filters has been initialized by {@link JobFilterBar} component
     * @type {boolean}
     * @private
     */
    this._isFiltersSet = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this.refreshJobSummaryList();
    this.openAutoStartDatafeedModal();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.lastRefresh !== this.props.lastRefresh) {
      this.setState({ isRefreshing: true });
      this.refreshJobSummaryList();
    }
  }

  componentWillUnmount() {
    blockingJobsRefreshTimeout = null;
    this._isMounted = false;
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
      // Only show clear notifications button if job has warning icon due to auditMessage
      const expandedJob = this.state.jobsSummaryList.filter((job) => job.id === jobId);
      const showClearButton = expandedJob.length > 0 && expandedJob[0].auditMessage !== undefined;
      let itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };

      if (this.state.fullJobsList[jobId] !== undefined) {
        itemIdToExpandedRowMap[jobId] = (
          <JobDetails
            jobId={jobId}
            job={this.state.fullJobsList[jobId]}
            addYourself={this.addUpdateFunction}
            removeYourself={this.removeUpdateFunction}
            refreshJobList={this.onRefreshClick}
            showClearButton={showClearButton}
          />
        );
      } else {
        itemIdToExpandedRowMap[jobId] = (
          <JobDetails
            jobId={jobId}
            addYourself={this.addUpdateFunction}
            removeYourself={this.removeUpdateFunction}
            refreshJobList={this.onRefreshClick}
            showClearButton={showClearButton}
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
                    refreshJobList={this.onRefreshClick}
                    showClearButton={showClearButton}
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

  setShowDatafeedChartFlyoutFunction = (func) => {
    this.showDatafeedChartFlyout = func;
  };
  unsetShowDatafeedChartFlyoutFunction = () => {
    this.showDatafeedChartFlyout = () => {};
  };

  setShowStopDatafeedsConfirmModalFunction = (func) => {
    this.showStopDatafeedsConfirmModal = func;
  };

  unsetShowStopDatafeedsConfirmModalFunction = () => {
    this.showStopDatafeedsConfirmModal = () => {};
  };

  setShowCloseJobsConfirmModalFunction = (func) => {
    this.showCloseJobsConfirmModal = func;
  };

  unsetShowCloseJobsConfirmModalFunction = () => {
    this.showCloseJobsConfirmModal = () => {};
  };

  setShowDeleteJobModalFunction = (func) => {
    this.showDeleteJobModal = func;
  };
  unsetShowDeleteJobModalFunction = () => {
    this.showDeleteJobModal = () => {};
  };

  setShowResetJobModalFunction = (func) => {
    this.showResetJobModal = func;
  };
  unsetShowResetJobModalFunction = () => {
    this.showResetJobModal = () => {};
  };

  setShowStartDatafeedModalFunction = (func) => {
    this.showStartDatafeedModal = func;
  };
  unsetShowStartDatafeedModalFunction = () => {
    this.showStartDatafeedModal = () => {};
  };

  setShowCreateAlertFlyoutFunction = (func) => {
    this.showCreateAlertFlyout = func;
  };
  unsetShowCreateAlertFlyoutFunction = () => {
    this.showCreateAlertFlyout = () => {};
  };
  getShowCreateAlertFlyoutFunction = () => {
    return this.showCreateAlertFlyout;
  };

  selectJobChange = (selectedJobs) => {
    this.setState({ selectedJobs });
  };

  refreshSelectedJobs() {
    const selectedJobsIds = this.state.selectedJobs.map((j) => j.id);
    const filteredJobIds = (this.state.filteredJobsSummaryList ?? []).map((j) => j.id);

    // refresh the jobs stored as selected
    // only select those which are also in the filtered list
    const selectedJobs = this.state.jobsSummaryList
      .filter((j) => selectedJobsIds.find((id) => id === j.id))
      .filter((j) => filteredJobIds.find((id) => id === j.id));

    this.setState({ selectedJobs });
  }

  setFilters = async (query) => {
    if (query === null) {
      this.setState(
        { filteredJobsSummaryList: this.state.jobsSummaryList, filterClauses: [] },
        () => {
          this.refreshSelectedJobs();
        }
      );

      return;
    }

    this.props.onJobsViewStateUpdate(
      {
        queryText: query?.text,
      },
      // Replace the URL state on filters initialization
      this._isFiltersSet === false
    );

    const filterClauses = (query && query.ast && query.ast.clauses) || [];

    if (filterClauses.length === 0) {
      this.setState({ filteredJobsSummaryList: this.state.jobsSummaryList, filterClauses }, () => {
        this.refreshSelectedJobs();
      });
      return;
    }

    const filteredJobsSummaryList = filterJobs(this.state.jobsSummaryList, filterClauses);
    this.setState({ filteredJobsSummaryList, filterClauses }, () => {
      this.refreshSelectedJobs();
    });

    this._isFiltersSet = true;
  };

  onRefreshClick = () => {
    this.setState({ isRefreshing: true });
    this.refreshJobSummaryList();
  };

  isDoneRefreshing = () => {
    this.setState({ isRefreshing: false });
  };

  async refreshJobSummaryList() {
    if (this._isMounted === false) {
      return;
    }

    // Set loading to true for jobs_list table for initial job loading
    if (this.state.loading === null) {
      this.setState({ loading: true });
    }

    const expandedJobsIds = Object.keys(this.state.itemIdToExpandedRowMap);
    try {
      let jobsAwaitingNodeCount = 0;
      const jobs = await ml.jobs.jobsSummary(expandedJobsIds);
      const fullJobsList = {};
      const jobsSummaryList = jobs.map((job) => {
        if (job.fullJob !== undefined) {
          fullJobsList[job.id] = job.fullJob;
          delete job.fullJob;
        }
        job.latestTimestampSortValue = job.latestTimestampMs || 0;

        if (job.awaitingNodeAssignment === true) {
          jobsAwaitingNodeCount++;
        }
        return job;
      });
      const filteredJobsSummaryList = filterJobs(jobsSummaryList, this.state.filterClauses);
      this.setState(
        {
          jobsSummaryList,
          filteredJobsSummaryList,
          fullJobsList,
          loading: false,
          jobsAwaitingNodeCount,
        },
        () => {
          this.refreshSelectedJobs();
        }
      );

      Object.keys(this.updateFunctions).forEach((j) => {
        this.updateFunctions[j](fullJobsList[j]);
      });

      this.isDoneRefreshing();
      if (jobsSummaryList.some((j) => j.blocked !== undefined)) {
        // if there are some jobs in a deleting state, start polling for
        // deleting jobs so we can update the jobs list once the
        // deleting tasks are over
        this.checkBlockingJobTasks(true);
      }
    } catch (error) {
      console.error(error);
      this.setState({ loading: false });
    }
  }

  async checkBlockingJobTasks(forceRefresh = false) {
    if (this._isMounted === false) {
      return;
    }

    const { jobs } = await ml.jobs.blockingJobTasks();
    const blockingJobIds = jobs.map((j) => Object.keys(j)[0]).sort();
    const taskListHasChanged = blockingJobIds.join() !== this.state.blockingJobIds.join();

    this.setState({
      blockingJobIds,
    });

    // only reload the jobs list if the contents of the task list has changed
    // or the check refresh has been forced i.e. from a user action
    if (taskListHasChanged || forceRefresh) {
      this.refreshJobSummaryList();
    }

    if (blockingJobIds.length > 0 && blockingJobsRefreshTimeout === null) {
      blockingJobsRefreshTimeout = setTimeout(() => {
        blockingJobsRefreshTimeout = null;
        this.checkBlockingJobTasks();
      }, DELETING_JOBS_REFRESH_INTERVAL_MS);
    }
  }

  renderJobsListComponents() {
    const { isRefreshing, loading, jobsSummaryList, jobsAwaitingNodeCount } = this.state;
    const jobIds = jobsSummaryList.map((j) => j.id);

    const noJobsFound = !loading && jobIds.length === 0;

    return (
      <div data-test-subj="ml-jobs-list">
        <NodeAvailableWarning />

        <JobsAwaitingNodeWarning jobCount={jobsAwaitingNodeCount} />

        <SavedObjectsWarning
          onCloseFlyout={this.onRefreshClick}
          forceRefresh={loading || isRefreshing}
        />

        <UpgradeWarning />

        <>
          {noJobsFound ? <AnomalyDetectionEmptyState /> : null}

          {jobIds.length > 0 ? (
            <>
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
                <EuiFlexGroup
                  css={{
                    alignItems: 'center',
                    minHeight: '60px',
                  }}
                  gutterSize="none"
                >
                  <EuiFlexItem grow={false}>
                    <MultiJobActions
                      selectedJobs={this.state.selectedJobs}
                      allJobIds={jobIds}
                      showCloseJobsConfirmModal={this.showCloseJobsConfirmModal}
                      showStartDatafeedModal={this.showStartDatafeedModal}
                      showDeleteJobModal={this.showDeleteJobModal}
                      showResetJobModal={this.showResetJobModal}
                      showCreateAlertFlyout={this.showCreateAlertFlyout}
                      showStopDatafeedsConfirmModal={this.showStopDatafeedsConfirmModal}
                      refreshJobs={() => this.refreshJobSummaryList()}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <JobFilterBar
                      setFilters={this.setFilters}
                      queryText={this.props.jobsViewState.queryText}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <JobsList
                  jobsSummaryList={this.state.filteredJobsSummaryList}
                  fullJobsList={this.state.fullJobsList}
                  itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
                  toggleRow={this.toggleRow}
                  selectJobChange={this.selectJobChange}
                  showEditJobFlyout={this.showEditJobFlyout}
                  showDatafeedChartFlyout={this.showDatafeedChartFlyout}
                  showDeleteJobModal={this.showDeleteJobModal}
                  showResetJobModal={this.showResetJobModal}
                  showCloseJobsConfirmModal={this.showCloseJobsConfirmModal}
                  showStartDatafeedModal={this.showStartDatafeedModal}
                  showStopDatafeedsConfirmModal={this.showStopDatafeedsConfirmModal}
                  refreshJobs={() => this.refreshJobSummaryList()}
                  jobsViewState={this.props.jobsViewState}
                  onJobsViewStateUpdate={this.props.onJobsViewStateUpdate}
                  selectedJobsCount={this.state.selectedJobs.length}
                  showCreateAlertFlyout={this.showCreateAlertFlyout}
                  loading={loading}
                />
              </div>
            </>
          ) : null}

          <EditJobFlyout
            setShowFunction={this.setShowEditJobFlyoutFunction}
            unsetShowFunction={this.unsetShowEditJobFlyoutFunction}
            refreshJobs={() => this.refreshJobSummaryList()}
            allJobIds={jobIds}
          />
          <JobListDatafeedChartFlyout
            setShowFunction={this.setShowDatafeedChartFlyoutFunction}
            unsetShowFunction={this.unsetShowDatafeedChartFlyoutFunction}
            refreshJobs={() => this.refreshJobSummaryList()}
          />
          <StopDatafeedsConfirmModal
            setShowFunction={this.setShowStopDatafeedsConfirmModalFunction}
            unsetShowFunction={this.unsetShowStopDatafeedsConfirmModalFunction}
            refreshJobs={() => this.refreshJobSummaryList()}
            allJobIds={jobIds}
          />
          <CloseJobsConfirmModal
            setShowFunction={this.setShowCloseJobsConfirmModalFunction}
            unsetShowFunction={this.unsetShowCloseJobsConfirmModalFunction}
            refreshJobs={() => this.refreshJobSummaryList()}
          />
          <DeleteJobModal
            setShowFunction={this.setShowDeleteJobModalFunction}
            unsetShowFunction={this.unsetShowDeleteJobModalFunction}
            refreshJobs={() => this.refreshJobSummaryList()}
          />
          <ResetJobModal
            setShowFunction={this.setShowResetJobModalFunction}
            unsetShowFunction={this.unsetShowResetJobModalFunction}
            refreshJobs={() => this.refreshJobSummaryList()}
          />
          <StartDatafeedModal
            setShowFunction={this.setShowStartDatafeedModalFunction}
            unsetShowFunction={this.unsetShowDeleteJobModalFunction}
            getShowCreateAlertFlyoutFunction={this.getShowCreateAlertFlyoutFunction}
            refreshJobs={() => this.refreshJobSummaryList()}
          />
          <JobListMlAnomalyAlertFlyout
            setShowFunction={this.setShowCreateAlertFlyoutFunction}
            unsetShowFunction={this.unsetShowCreateAlertFlyoutFunction}
            onSave={this.onRefreshClick}
          />
        </>
      </div>
    );
  }

  render() {
    return <div>{this.renderJobsListComponents()}</div>;
  }
}
