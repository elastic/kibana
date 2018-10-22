/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import './styles/main.less';
import { timefilter } from 'ui/timefilter';

import { ml } from 'plugins/ml/services/ml_api_service';
import { loadFullJob, filterJobs } from '../utils';
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
import { NodeAvailableWarning } from '../node_available_warning';
import { RefreshJobsListButton } from '../refresh_jobs_list_button';

import React, {
  Component
} from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

const DEFAULT_REFRESH_INTERVAL_MS = 30000;
const MINIMUM_REFRESH_INTERVAL_MS = 5000;
let jobsRefreshInterval =  null;

export class JobsListView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isRefreshing: false,
      jobsSummaryList: [],
      filteredJobsSummaryList: [],
      fullJobsList: {},
      selectedJobs: [],
      itemIdToExpandedRowMap: {},
      filterClauses: [],
    };

    this.updateFunctions = {};

    this.showEditJobFlyout = () => {};
    this.showDeleteJobModal = () => {};
    this.showStartDatafeedModal = () => {};
    this.showCreateWatchFlyout = () => {};

    this.blockRefresh = false;
  }

  componentDidMount() {
    timefilter.disableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    this.initAutoRefresh();
    this.initAutoRefreshUpdate();
  }

  componentWillUnmount() {
    timefilter.off('refreshIntervalUpdate');
    this.clearRefreshInterval();
  }

  initAutoRefresh() {
    const { value } = timefilter.getRefreshInterval();
    if (value === 0) {
      // the auto refresher starts in an off state
      // so switch it on and set the interval to 30s
      timefilter.setRefreshInterval({
        pause: false,
        value: DEFAULT_REFRESH_INTERVAL_MS
      });
    }

    this.setAutoRefresh();
  }

  initAutoRefreshUpdate() {
    // update the interval if it changes
    timefilter.on('refreshIntervalUpdate', () => {
      this.setAutoRefresh();
    });
  }

  setAutoRefresh() {
    const { value, pause } = timefilter.getRefreshInterval();
    if (pause) {
      this.clearRefreshInterval();
    } else {
      this.setRefreshInterval(value);
    }
    this.refreshJobSummaryList(true);
  }

  setRefreshInterval(interval) {
    this.clearRefreshInterval();
    if (interval >= MINIMUM_REFRESH_INTERVAL_MS) {
      this.blockRefresh = false;
      jobsRefreshInterval = setInterval(() => (this.refreshJobSummaryList()), interval);
    }
  }

  clearRefreshInterval() {
    this.blockRefresh = true;
    clearInterval(jobsRefreshInterval);
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
          />
        );
      } else {
        itemIdToExpandedRowMap[jobId] = (
          <JobDetails
            jobId={jobId}
            addYourself={this.addUpdateFunction}
            removeYourself={this.removeUpdateFunction}
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
                  />
                );
              }
              this.setState({ itemIdToExpandedRowMap });
            });
          })
          .catch((error) => {
            console.error(error);
          });
      });
    }
  }

  addUpdateFunction = (id, f) => {
    this.updateFunctions[id] = f;
  }
  removeUpdateFunction = (id) => {
    delete this.updateFunctions[id];
  }

  setShowEditJobFlyoutFunction = (func) => {
    this.showEditJobFlyout = func;
  }
  unsetShowEditJobFlyoutFunction = () => {
    this.showEditJobFlyout = () => {};
  }

  setShowDeleteJobModalFunction = (func) => {
    this.showDeleteJobModal = func;
  }
  unsetShowDeleteJobModalFunction = () => {
    this.showDeleteJobModal = () => {};
  }

  setShowStartDatafeedModalFunction = (func) => {
    this.showStartDatafeedModal = func;
  }
  unsetShowStartDatafeedModalFunction = () => {
    this.showStartDatafeedModal = () => {};
  }

  setShowCreateWatchFlyoutFunction = (func) => {
    this.showCreateWatchFlyout = func;
  }
  unsetShowCreateWatchFlyoutFunction = () => {
    this.showCreateWatchFlyout = () => {};
  }
  getShowCreateWatchFlyoutFunction = () => {
    return this.showCreateWatchFlyout;
  }

  selectJobChange = (selectedJobs) => {
    this.setState({ selectedJobs });
  }

  refreshSelectedJobs() {
    const selectedJobsIds = this.state.selectedJobs.map(j => j.id);
    const filteredJobIds = this.state.filteredJobsSummaryList.map(j => j.id);

    // refresh the jobs stored as selected
    // only select those which are also in the filtered list
    const selectedJobs = this.state.jobsSummaryList
      .filter(j => selectedJobsIds.find(id => id === j.id))
      .filter(j => filteredJobIds.find(id => id === j.id));

    this.setState({ selectedJobs });
  }

  setFilters = (filterClauses) => {
    const filteredJobsSummaryList = filterJobs(this.state.jobsSummaryList, filterClauses);
    this.setState({ filteredJobsSummaryList, filterClauses }, () => {
      this.refreshSelectedJobs();
    });
  }

  onRefreshClick = () => {
    this.setState({ isRefreshing: true });
    this.refreshJobSummaryList(true);
  }
  isDoneRefreshing = () => {
    this.setState({ isRefreshing: false });
  }

  refreshJobSummaryList(forceRefresh = false) {
    if (forceRefresh === true || this.blockRefresh === false) {
      const expandedJobsIds = Object.keys(this.state.itemIdToExpandedRowMap);
      ml.jobs.jobsSummary(expandedJobsIds)
        .then((jobs) => {
          const fullJobsList = {};
          const jobsSummaryList = jobs.map((job) => {
            if (job.fullJob !== undefined) {
              fullJobsList[job.id] = job.fullJob;
              delete job.fullJob;
            }
            job.latestTimeStampSortValue = (job.latestTimeStampMs || 0);
            return job;
          });
          const filteredJobsSummaryList = filterJobs(jobsSummaryList, this.state.filterClauses);
          this.setState({ jobsSummaryList, filteredJobsSummaryList, fullJobsList }, () => {
            this.refreshSelectedJobs();
          });

          Object.keys(this.updateFunctions).forEach((j) => {
            this.updateFunctions[j].setState({ job: fullJobsList[j] });
          });

          this.isDoneRefreshing();
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  renderJobsListComponents() {
    const jobIds = this.state.jobsSummaryList.map(j => j.id);
    return (
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
          compile={this.props.compile}
        />
      </div>
    );
  }

  render() {
    const { isRefreshing, jobsSummaryList } = this.state;

    return (
      <React.Fragment>
        <JobStatsBar
          jobsSummaryList={jobsSummaryList}
        />
        <div className="job-management">
          <NodeAvailableWarning />
          <header>
            <div className="job-buttons-container">
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <RefreshJobsListButton
                    onRefreshClick={this.onRefreshClick}
                    isRefreshing={isRefreshing}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NewJobButton />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </header>

          <div className="clear" />

          <EuiSpacer size="s" />

          { this.renderJobsListComponents() }
        </ div>
      </React.Fragment>
    );
  }
}

