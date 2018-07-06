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
import { MultiJobActions } from '../multi_job_actions';

import React, {
  Component
} from 'react';

const DEFAULT_REFRESH_INTERVAL_MS = 30000;

export class JobsListView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobsSummaryList: [],
      filteredJobsSummaryList: [],
      fullJobsList: {},
      selectedJobs: [],
      itemIdToExpandedRowMap: {},
      filterClauses: []
    };

    this.updateFunctions = {};

    this.showEditJobFlyout = () => {};
    this.showDeleteJobModal = () => {};
    this.showStartDatafeedModal = () => {};

    this.blockRefresh = false;
    this.refreshIntervalMS = DEFAULT_REFRESH_INTERVAL_MS;
    this.refreshInterval = null;
  }

  componentDidMount() {
    timefilter.enableAutoRefreshSelector();

    this.initAutoRefresh();
    this.initAutoRefreshUpdate();
  }

  componentWillUnmount() {
    this.blockRefresh = true;
  }

  initAutoRefresh() {
    const { value, pause } = timefilter.getRefreshInterval();
    if (pause === false && value === 0) {
      // if the auto refresher isn't set, set it to the default (5 secs)
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
    } else if (value === 0) {
      // if unpaused but interval is 0, force pause
      this.setRefreshInterval(value);
      this.clearRefreshInterval();
      this.forcePauseTimefilter();
    } else {
      this.setRefreshInterval(value);
    }
    this.refreshJobSummaryList(true);
  }

  setRefreshInterval(interval) {
    clearInterval(this.refreshInterval);
    this.refreshIntervalMS = interval;
    this.blockRefresh = false;
    this.refreshInterval = setInterval(() => (this.refreshJobSummaryList()), this.refreshIntervalMS);
  }

  clearRefreshInterval() {
    this.blockRefresh = true;
    clearInterval(this.refreshInterval);
  }

  forcePauseTimefilter() {
    // if refreshIntervalMS = 0, the auto refresh component has been switched off
    timefilter.setRefreshInterval({
      pause: true,
      value: this.refreshIntervalMS
    });
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
          />
        );
      } else {
        itemIdToExpandedRowMap[jobId] = (
          <JobDetails
            jobId={jobId}
            addYourself={this.addUpdateFunction}
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
            job.latestTimeStampUnix = job.latestTimeStamp.unix;
            return job;
          });
          const filteredJobsSummaryList = filterJobs(jobsSummaryList, this.state.filterClauses);
          this.setState({ jobsSummaryList, filteredJobsSummaryList, fullJobsList }, () => {
            this.refreshSelectedJobs();
          });

          Object.keys(this.updateFunctions).forEach((j) => {
            this.updateFunctions[j].setState({ job: fullJobsList[j] });
          });
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  render() {
    return (
      <div>
        <div className="actions-bar">
          <MultiJobActions
            selectedJobs={this.state.selectedJobs}
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
        />
        <EditJobFlyout
          setShowFunction={this.setShowEditJobFlyoutFunction}
          unsetShowFunction={this.unsetShowEditJobFlyoutFunction}
          refreshJobs={() => this.refreshJobSummaryList(true)}
        />
        <DeleteJobModal
          setShowFunction={this.setShowDeleteJobModalFunction}
          unsetShowFunction={this.unsetShowDeleteJobModalFunction}
          refreshJobs={() => this.refreshJobSummaryList(true)}
        />
        <StartDatafeedModal
          setShowFunction={this.setShowStartDatafeedModalFunction}
          unsetShowFunction={this.unsetShowDeleteJobModalFunction}
          refreshJobs={() => this.refreshJobSummaryList(true)}
        />
      </div>
    );
  }
}
