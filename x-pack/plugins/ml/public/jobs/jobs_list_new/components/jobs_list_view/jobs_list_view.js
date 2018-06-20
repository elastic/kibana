/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


// import moment from 'moment';
import './styles/main.less';

import { ml } from 'plugins/ml/services/ml_api_service';
// import { mlJobService } from 'plugins/ml/services/job_service';
// import { mlCalendarService } from 'plugins/ml/services/calendar_service';
import { JobsList } from '../jobs_list';
import { JobDetails } from '../job_details';
import { EditJobFlyout } from '../edit_job_flyout';
import { DeleteJobModal } from '../delete_job_modal';
import { StartDatafeedModal } from '../start_datafeed_modal';
import { MultiJobActions } from '../multi_job_actions';

import React, {
  Component
} from 'react';

// const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// function loadJobs() {
//   return new Promise((resolve) => {
//     mlJobService.loadJobs()
//       .then((resp) => {
//         mlCalendarService.loadCalendars(resp.jobs)
//           .then(() => {
//             resolve(resp.jobs);
//           })
//           .catch(() => {
//             resolve(resp.jobs);
//           });
//       })
//       .catch((resp) => {
//         resolve(resp.jobs);
//       });
//   });
// }

// function earliestAndLatestTimeStamps(dataCounts) {
//   const obj = {
//     earliest: { string: '', unix: 0 },
//     latest: { string: '', unix: 0 },
//   };

//   if (dataCounts.earliest_record_timestamp) {
//     const ts = moment(dataCounts.earliest_record_timestamp);
//     obj.earliest.string = ts.format(TIME_FORMAT);
//     obj.earliest.unix = ts.valueOf();
//     obj.earliest.moment = ts;
//   }

//   if (dataCounts.latest_record_timestamp) {
//     const ts = moment(dataCounts.latest_record_timestamp);
//     obj.latest.string = ts.format(TIME_FORMAT);
//     obj.latest.unix = ts.valueOf();
//     obj.latest.moment = ts;
//   }

//   return obj;
// }

// function loadJobDetails(jobId) {
//   return mlJobService.refreshJob(jobId)
//   	.then(() => {
//       return mlJobService.getJob(jobId);
//     })
//     .catch((error) => {
//       console.log(error);
//     });
// }

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

    this.showEditJobFlyout = null;
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
        ml.jobService.jobs(jobId)
          .then((jobs) => {
            if (jobs.length) {
              const job = jobs[0];
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
            }
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

  setShowEditJobFlyoutFunction = (func) => {
    this.showEditJobFlyout = func;
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
      const expandedJobsIds = Object.keys(this.state.itemIdToExpandedRowMap);
      ml.jobService.jobsSummary(expandedJobsIds)
        .then((jobs) => {
          const fullJobsList = [];
          const jobsSummaryList = jobs.map((job) => {
            if (job.fullJob !== undefined) {
              fullJobsList[job.id] = job.fullJob;
              delete job.fullJob;
            }
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
          console.log(error);
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
        <EditJobFlyout showFunction={this.setShowEditJobFlyoutFunction} refreshJobs={() => this.refreshJobSummaryList(false)} />
        <DeleteJobModal showFunction={this.setShowDeleteJobModalFunction} refreshJobs={() => this.refreshJobSummaryList(false)} />
        <StartDatafeedModal showFunction={this.setShowStartDatafeedModalFunction} refreshJobs={() => this.refreshJobSummaryList(false)} />
      </div>
    );
  }
}
