/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import moment from 'moment';

import { mlJobService } from 'plugins/ml/services/job_service';
import { toastNotifications } from 'ui/notify';

import { TimeRangeSelector } from './time_range_selector';

export class StartDatafeedModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
      startTime: moment(),
      endTime: moment()
    };

    if (typeof this.props.showFunction === 'function') {
      this.props.showFunction(this.showModal);
    }
    if (typeof this.props.saveFunction === 'function') {
      this.externalSave = this.props.saveFunction;
    }
    this.job = this.props.job;
    this.refreshJobs = this.props.refreshJobs;
  }

  setStartTime = (time) => {
    this.setState({ startTime: time });
  }

  setEndTime = (time) => {
    this.setState({ endTime: time });
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = (job) => {
    let startTime = moment();
    if (job !== undefined) {
      this.job = job;
      startTime = moment(this.job.latestTimeStamp);
    }
    this.setState({ isModalVisible: true, startTime });
  }

  save = () => {
    const duration = {
      start: moment.isMoment(this.state.startTime) ? this.state.startTime.valueOf() : this.state.startTime,
      end: moment.isMoment(this.state.endTime) ? this.state.endTime.valueOf() : this.state.endTime,
    };
    startDatafeed(this.job.id, duration, false, this.refreshJobs);
    this.closeModal();
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <EuiOverlayMask>
          <EuiModal
            onClose={this.closeModal}
            style={{ width: '850px' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                Start {this.job.id}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <TimeRangeSelector
                startTime={this.state.startTime}
                endTime={this.state.endTime}
                setStartTime={this.setStartTime}
                setEndTime={this.setEndTime}
              />
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty
                onClick={this.closeModal}
              >
                Cancel
              </EuiButtonEmpty>

              <EuiButton
                onClick={this.save}
                fill
              >
                Start
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      );
    }
    return (
      <div>
        {modal}
      </div>
    );

  }
}

function startDatafeed(jobId, duration, createWatch, finish) {
  let doStartCalled = false;
  // in 10s call the function to start the datafeed.
  // if the job has already opened and doStart has already been called, nothing will happen.
  // However, if the job is still waiting to be opened, the datafeed can be started anyway.
  window.setTimeout(doStart, 10000);

  // Attempt to open the job first.
  // If it's already open, ignore the 409 error
  mlJobService.openJob(jobId)
    .then(() => {
      doStart();
    })
    .catch((resp) => {
      if (resp.statusCode === 409) {
        doStart();
      } else {
        if (resp.statusCode === 500) {
          if (doStartCalled === false) {
            // doStart hasn't been called yet, this 500 has returned before 10s,
            // so it's not due to a timeout
            toastNotifications.addDanger(`Could not open ${jobId}`, resp);
          }
        } else {
          // console.log(resp);
          toastNotifications.addDanger(`Could not open ${jobId}`, resp);
        }
        // $scope.saveLock = false;
      }
    });

  // start the datafeed
  function doStart() {
    if (doStartCalled === false) {
      const datafeedId = mlJobService.getDatafeedId(jobId);
      doStartCalled = true;
      mlJobService.startDatafeed(datafeedId, jobId, duration.start, duration.end)
        .then(() => {
          // $rootScope.$broadcast('jobsUpdated');
          finish();

          if (createWatch) {
            // $rootScope.$broadcast('openCreateWatchWindow', job);
          }
        })
        .catch(() => {
          // $scope.saveLock = false;
        });
    }
  }
}
