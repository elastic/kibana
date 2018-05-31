/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import moment from 'moment';
import { mlJobService } from 'plugins/ml/services/job_service';
import { mlCalendarService } from 'plugins/ml/services/calendar_service';
import { JobsList } from '../jobs_list';
import { JobDetails } from '../job_details';

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

function latestTimeStamp(dataCounts) {
  const obj = { string: '', unix: 0 };
  if (dataCounts.latest_record_timestamp) {
    const ts = moment(dataCounts.latest_record_timestamp);
    obj.string = ts.format(TIME_FORMAT);
    obj.unix = ts;
  }
  return obj;
}

function loadJobDetails(jobId) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(mlJobService.getJob(jobId));
    }, 100);
  });
}

export class JobsListView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobsSummaryList: [],
      fullJobsList: {},
      itemIdToExpandedRowMap: {}
    };

    this.refreshJobs();
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
          />
        );
      } else {
        itemIdToExpandedRowMap[jobId] = (
          <JobDetails
            jobId={jobId}
          />
        );
      }

      this.setState({ itemIdToExpandedRowMap });

      loadJobDetails(jobId)
        .then((job) => {
          const fullJobsList = { ...this.state.fullJobsList };
          fullJobsList[jobId] = job;
          // take a fresh copy of the itemIdToExpandedRowMap object
          itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
          if (itemIdToExpandedRowMap[jobId] !== undefined) {
            // wrap in a check, in case the user closes the expansion before the
            // loading has finished
            itemIdToExpandedRowMap[jobId] = (
              <JobDetails
                jobId={jobId}
                job={job}
              />
            );
          }
          this.setState({ fullJobsList, itemIdToExpandedRowMap });
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }

  refreshJobs() {
    loadJobs()
    	.then((resp) => {
        const fullJobsList = this.state.fullJobsList;
        const jobsSummaryList = resp.map((job) => {

          // if the full job already exists, replace it with a fresh copy
          if (fullJobsList[job.job_id] !== undefined) {
            fullJobsList[job.job_id] = job;
          }

          return {
            id: job.job_id,
            description: (job.description || ''),
            processed_record_count: job.data_counts.processed_record_count,
            memory_status: (job.model_size_stats) ? job.model_size_stats.memory_status : '',
            jobState: job.state,
            datafeedState: (job.datafeed_config.state) ? job.datafeed_config.state : '',
            latestTimeStamp: latestTimeStamp(job.data_counts).string
          };
        });
        this.setState({ jobsSummaryList, fullJobsList });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  render() {
    return (
      <div>
        <JobsList
          jobsSummaryList={this.state.jobsSummaryList}
          fullJobsList={this.state.fullJobsList}
          itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
          toggleRow={this.toggleRow}
        />
      </div>
    );
  }
}
