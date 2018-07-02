/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import './styles/main.less';

import { ml } from 'plugins/ml/services/ml_api_service';
import { loadFullJob } from '../utils';
import { JobsList } from '../jobs_list';
import { JobDetails } from '../job_details';
import { EditJobFlyout } from '../edit_job_flyout';
import { DeleteJobModal } from '../delete_job_modal';
import { StartDatafeedModal } from '../start_datafeed_modal';
import { MultiJobActions } from '../multi_job_actions';

import React, {
  Component
} from 'react';

export class JobsListView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobsSummaryList: [],
      fullJobsList: {},
      selectedJobs: [],
      itemIdToExpandedRowMap: {}
    };

    this.updateFunctions = {};

    this.showEditJobFlyout = () => {};
    this.showDeleteJobModal = () => {};
    this.showStartDatafeedModal = () => {};

    this.blockAutoRefresh = false;

    this.refreshJobSummaryList();
  }

  componentWillUnmount() {
    this.blockAutoRefresh = true;
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

  refreshJobSummaryList(autoRefresh = true) {
    if (this.blockAutoRefresh === false) {
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
          this.setState({ jobsSummaryList, fullJobsList });

          Object.keys(this.updateFunctions).forEach((j) => {
            this.updateFunctions[j].setState({ job: fullJobsList[j] });
          });

          if (autoRefresh === true) {
            setTimeout(() => {
              this.refreshJobSummaryList();
            }, 10000);
          }
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
            refreshJobs={() => this.refreshJobSummaryList(false)}
          />
        </div>
        <JobsList
          jobsSummaryList={this.state.jobsSummaryList}
          fullJobsList={this.state.fullJobsList}
          itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
          toggleRow={this.toggleRow}
          selectJobChange={this.selectJobChange}
          showEditJobFlyout={this.showEditJobFlyout}
          showDeleteJobModal={this.showDeleteJobModal}
          showStartDatafeedModal={this.showStartDatafeedModal}
          refreshJobs={() => this.refreshJobSummaryList(false)}
        />
        <EditJobFlyout
          setShowFunction={this.setShowEditJobFlyoutFunction}
          unsetShowFunction={this.unsetShowEditJobFlyoutFunction}
          refreshJobs={() => this.refreshJobSummaryList(false)}
        />
        <DeleteJobModal
          setShowFunction={this.setShowDeleteJobModalFunction}
          unsetShowFunction={this.unsetShowDeleteJobModalFunction}
          refreshJobs={() => this.refreshJobSummaryList(false)}
        />
        <StartDatafeedModal
          setShowFunction={this.setShowStartDatafeedModalFunction}
          unsetShowFunction={this.unsetShowDeleteJobModalFunction}
          refreshJobs={() => this.refreshJobSummaryList(false)}
        />
      </div>
    );
  }
}
