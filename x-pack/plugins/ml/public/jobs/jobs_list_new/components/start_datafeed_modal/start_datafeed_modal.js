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

import { forceStartDatafeeds } from '../utils';

import { TimeRangeSelector } from './time_range_selector';

export class StartDatafeedModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobs: this.props.jobs,
      isModalVisible: false,
      startTime: moment(),
      endTime: moment(),
      initialSpecifiedStartTime: moment()
    };

    if (typeof this.props.showFunction === 'function') {
      this.props.showFunction(this.showModal);
    }
    if (typeof this.props.saveFunction === 'function') {
      this.externalSave = this.props.saveFunction;
    }
    this.initialSpecifiedStartTime = moment();
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

  showModal = (jobs) => {
    const startTime = undefined;
    const endTime = moment();
    const initialSpecifiedStartTime = getLowestLatestTime(jobs);
    this.setState({
      jobs,
      isModalVisible: true,
      startTime,
      endTime,
      initialSpecifiedStartTime
    });
  }

  save = () => {
    const start = moment.isMoment(this.state.startTime) ? this.state.startTime.valueOf() : this.state.startTime;
    const end = moment.isMoment(this.state.endTime) ? this.state.endTime.valueOf() : this.state.endTime;
    forceStartDatafeeds(this.state.jobs, start, end, this.refreshJobs);
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
                Start {(this.state.jobs.length > 1) ? `${this.state.jobs.length} jobs` : this.state.jobs[0].id}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <TimeRangeSelector
                startTime={this.state.initialSpecifiedStartTime}
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

function getLowestLatestTime(jobs) {
  const times = jobs.map(j => j.latestTimeStamp.unix.valueOf());
  return moment(Math.min(...times));
}
