/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiHorizontalRule,
  EuiCheckbox,
} from '@elastic/eui';

import moment from 'moment';

import { forceStartDatafeeds } from '../utils';

import { TimeRangeSelector } from './time_range_selector';

import { FormattedMessage } from '@kbn/i18n-react';
import { isManagedJob } from '../../../jobs_utils';

export class StartDatafeedModal extends Component {
  constructor(props) {
    super(props);

    const now = moment();
    this.state = {
      jobs: this.props.jobs,
      isModalVisible: false,
      startTime: now,
      endTime: now,
      createAlert: false,
      allowCreateAlert: false,
      initialSpecifiedStartTime: now,
      now,
      timeRangeValid: true,
      hasManagedJob: false,
    };

    this.initialSpecifiedStartTime = now;
    this.refreshJobs = this.props.refreshJobs;
    this.getShowCreateAlertFlyoutFunction = this.props.getShowCreateAlertFlyoutFunction;
  }

  componentDidMount() {
    if (typeof this.props.setShowFunction === 'function') {
      this.props.setShowFunction(this.showModal);
    }
  }

  componentWillUnmount() {
    if (typeof this.props.unsetShowFunction === 'function') {
      this.props.unsetShowFunction();
    }
  }

  setStartTime = (time) => {
    this.setState({ startTime: time });
  };

  setEndTime = (time) => {
    this.setState({ endTime: time });
  };

  setCreateAlert = (e) => {
    this.setState({ createAlert: e.target.checked });
  };

  closeModal = () => {
    this.setState({ isModalVisible: false });
  };

  setTimeRangeValid = (timeRangeValid) => {
    this.setState({ timeRangeValid });
  };

  showModal = (jobs, showCreateAlertFlyout) => {
    const startTime = undefined;
    const now = moment();
    const endTime = now;
    const initialSpecifiedStartTime = getLowestLatestTime(jobs);
    const allowCreateAlert = jobs.length > 0;

    this.setState({
      jobs,
      isModalVisible: true,
      startTime,
      endTime,
      initialSpecifiedStartTime,
      showCreateAlertFlyout,
      allowCreateAlert,
      createAlert: false,
      now,
      hasManagedJob: jobs.some((j) => isManagedJob(j)),
    });
  };

  save = () => {
    const { jobs } = this.state;
    const start = moment.isMoment(this.state.startTime)
      ? this.state.startTime.valueOf()
      : this.state.startTime;
    const end = moment.isMoment(this.state.endTime)
      ? this.state.endTime.valueOf()
      : this.state.endTime;

    forceStartDatafeeds(jobs, start, end, () => {
      if (this.state.createAlert && jobs.length > 0) {
        this.getShowCreateAlertFlyoutFunction()(jobs.map((job) => job.id));
      }
      this.refreshJobs();
    });
    this.closeModal();
  };

  render() {
    const {
      jobs,
      initialSpecifiedStartTime,
      startTime,
      endTime,
      createAlert,
      now,
      timeRangeValid,
    } = this.state;
    const startableJobs = jobs !== undefined ? jobs.filter((j) => j.hasDatafeed) : [];
    // disable start button if the start and end times are the same
    const startDisabled =
      timeRangeValid === false || (startTime !== undefined && startTime === endTime);
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <EuiModal
          onClose={this.closeModal}
          style={{ width: '850px' }}
          maxWidth={false}
          data-test-subj="mlStartDatafeedModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="xpack.ml.jobsList.startDatafeedModal.startJobsTitle"
                defaultMessage="Start {jobsCount, plural, one {{jobId}} other {# jobs}}"
                values={{
                  jobsCount: startableJobs.length,
                  jobId: startableJobs[0].id,
                }}
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <TimeRangeSelector
              startTime={startTime === undefined ? initialSpecifiedStartTime : startTime}
              endTime={endTime}
              setStartTime={this.setStartTime}
              setEndTime={this.setEndTime}
              now={now}
              setTimeRangeValid={this.setTimeRangeValid}
              hasManagedJob={this.state.hasManagedJob}
              jobsCount={startableJobs.length}
            />
            {this.state.endTime === undefined && (
              <div className="create-watch">
                <EuiHorizontalRule />
                <EuiCheckbox
                  id="createAlert"
                  label={
                    <FormattedMessage
                      id="xpack.ml.jobsList.startDatafeedModal.createAlertDescription"
                      defaultMessage="Create alert rule after datafeed has started"
                    />
                  }
                  checked={createAlert}
                  onChange={this.setCreateAlert}
                />
              </div>
            )}
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={this.closeModal}
              data-test-subj="mlStartDatafeedModalCancelButton"
            >
              <FormattedMessage
                id="xpack.ml.jobsList.startDatafeedModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            <EuiButton
              onClick={this.save}
              isDisabled={startDisabled}
              fill
              data-test-subj="mlStartDatafeedModalStartButton"
            >
              <FormattedMessage
                id="xpack.ml.jobsList.startDatafeedModal.startButtonLabel"
                defaultMessage="Start"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      );
    }
    return <div>{modal}</div>;
  }
}
StartDatafeedModal.propTypes = {
  setShowFunction: PropTypes.func.isRequired,
  unsetShowFunction: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};

function getLowestLatestTime(jobs) {
  const times = jobs.map((j) => j.earliestStartTimestampMs || 0);
  return moment(Math.min(...times));
}
