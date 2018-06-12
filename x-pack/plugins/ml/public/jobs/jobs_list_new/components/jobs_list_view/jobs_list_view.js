/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import moment from 'moment';
import './styles/main.less';

import { mlJobService } from 'plugins/ml/services/job_service';
import { mlCalendarService } from 'plugins/ml/services/calendar_service';
import { JobsList } from '../jobs_list';
import { JobDetails } from '../job_details';
import { EditJobModal } from '../edit_job_modal';
import { DeleteJobModal } from '../delete_job_modal';
import { StartDatafeedModal } from '../start_datafeed_modal';
import { MultiJobActions } from '../multi_job_actions';

import React, {
  Component
} from 'react';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

function loadJobs() {
  return new Promise((resolve) => {
    mlJobService.loadJobs()
      .then((resp) => {
        mlCalendarService.loadCalendars(resp.jobs)
          .then(() => {
            resolve(resp.jobs);
          })
          .catch(() => {
            resolve(resp.jobs);
          });
      })
      .catch((resp) => {
        resolve(resp.jobs);
      });
  });
}

function earliestAndLatestTimeStamps(dataCounts) {
  const obj = {
    earliest: { string: '', unix: 0 },
    latest: { string: '', unix: 0 },
  };

  if (dataCounts.earliest_record_timestamp) {
    const ts = moment(dataCounts.earliest_record_timestamp);
    obj.earliest.string = ts.format(TIME_FORMAT);
    obj.earliest.unix = ts;
  }

  if (dataCounts.latest_record_timestamp) {
    const ts = moment(dataCounts.latest_record_timestamp);
    obj.latest.string = ts.format(TIME_FORMAT);
    obj.latest.unix = ts;
  }

  return obj;
}

function loadJobDetails(jobId) {
  return mlJobService.refreshJob(jobId)
  	.then(() => {
      return mlJobService.getJob(jobId);
    })
    .catch((error) => {
      console.log(error);
    });
}

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
    this.listComponent = null;

    this.showEditJobModal = null;
    this.showDeleteJobModal = null;
    this.showStartDatafeedModal = null;

    this.blockAutoRefresh = false;

    this.refreshJobSummaryList();
    console.log('JobsListView constructor');
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

        loadJobDetails(jobId)
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
            console.log(error);
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

  setShowEditJobModalFunction = (func) => {
    this.showEditJobModal = func;
  }
  setShowDeleteJobModalFunction = (func) => {
    this.showDeleteJobModal = func;
  }
  setShowStartDatafeedModalFunction = (func) => {
    this.showStartDatafeedModal = func;
  }

  selectJobChange = (selectedJobs) => {
    this.setState({ selectedJobs });
    console.log(selectedJobs);
  }


  refreshJobSummaryList(autoRefresh = true) {
    if (this.blockAutoRefresh === false) {
      loadJobs()
        .then((resp) => {
          const fullJobsList = this.state.fullJobsList;
          const jobsSummaryList = resp.map((job) => {

            // if the full job already exists, replace it with a fresh copy
            if (fullJobsList[job.job_id] !== undefined) {
              fullJobsList[job.job_id] = job;
            }
            const hasDatafeed = (job.datafeed_config !== undefined);
            const {
              earliest: earliestTimeStamp,
              latest: latestTimeStamp } = earliestAndLatestTimeStamps(job.data_counts);
            return {
              id: job.job_id,
              description: (job.description || ''),
              groups: (job.groups || []),
              processed_record_count: job.data_counts.processed_record_count,
              memory_status: (job.model_size_stats) ? job.model_size_stats.memory_status : '',
              jobState: job.state,
              hasDatafeed,
              datafeedState: (hasDatafeed && job.datafeed_config.state) ? job.datafeed_config.state : '',
              latestTimeStamp,
              earliestTimeStamp,
            };
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
          console.log(error);
        });
    }
  }

  render() {
    return (
      <div>
        <div className="actions-bar">
          <MultiJobActions selectedJobs={this.state.selectedJobs} />
        </div>
        <JobsList
          jobsSummaryList={this.state.jobsSummaryList}
          fullJobsList={this.state.fullJobsList}
          itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
          toggleRow={this.toggleRow}
          selectJobChange={this.selectJobChange}
          showEditJobModal={this.showEditJobModal}
          showDeleteJobModal={this.showDeleteJobModal}
          showStartDatafeedModal={this.showStartDatafeedModal}
          refreshJobs={() => this.refreshJobSummaryList(false)}
        />
        <EditJobModal showFunction={this.setShowEditJobModalFunction} refreshJobs={() => this.refreshJobSummaryList(false)} />
        <DeleteJobModal showFunction={this.setShowDeleteJobModalFunction} refreshJobs={() => this.refreshJobSummaryList(false)} />
        <StartDatafeedModal showFunction={this.setShowStartDatafeedModalFunction} refreshJobs={() => this.refreshJobSummaryList(false)} />
      </div>
    );
  }
}
