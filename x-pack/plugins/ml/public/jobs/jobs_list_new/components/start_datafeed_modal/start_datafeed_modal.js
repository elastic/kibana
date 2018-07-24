/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
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
  EuiHorizontalRule,
  EuiCheckbox,

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
      createWatch: false,
      allowCreateWatch: false,
      initialSpecifiedStartTime: moment()
    };

    this.initialSpecifiedStartTime = moment();
    this.refreshJobs = this.props.refreshJobs;
    this.getShowCreateWatchFlyoutFunction = this.props.getShowCreateWatchFlyoutFunction;
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
  }

  setEndTime = (time) => {
    this.setState({ endTime: time });
  }

  setCreateWatch = (e) => {
    this.setState({ createWatch: e.target.checked });
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = (jobs, showCreateWatchFlyout) => {
    const startTime = undefined;
    const endTime = moment();
    const initialSpecifiedStartTime = getLowestLatestTime(jobs);
    const allowCreateWatch = (jobs.length === 1);
    this.setState({
      jobs,
      isModalVisible: true,
      startTime,
      endTime,
      initialSpecifiedStartTime,
      showCreateWatchFlyout,
      allowCreateWatch,
      createWatch: false,
    });
  }

  save = () => {
    const { jobs } = this.state;
    const start = moment.isMoment(this.state.startTime) ? this.state.startTime.valueOf() : this.state.startTime;
    const end = moment.isMoment(this.state.endTime) ? this.state.endTime.valueOf() : this.state.endTime;
    forceStartDatafeeds(jobs, start, end, () => {
      if (this.state.createWatch && jobs.length === 1) {
        const jobId = jobs[0].id;
        this.getShowCreateWatchFlyoutFunction()(jobId);
      }
      this.refreshJobs();
    });
    this.closeModal();
  }

  render() {
    const {
      jobs,
      initialSpecifiedStartTime,
      endTime,
      createWatch
    } = this.state;
    const startableJobs = (jobs !== undefined) ? jobs.filter(j => j.hasDatafeed) : [];
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
                Start {(startableJobs.length > 1) ? `${startableJobs.length} jobs` : startableJobs[0].id}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <TimeRangeSelector
                startTime={initialSpecifiedStartTime}
                endTime={endTime}
                setStartTime={this.setStartTime}
                setEndTime={this.setEndTime}
              />
              {
                this.state.endTime === undefined &&
                <div className="create-watch">
                  <EuiHorizontalRule />
                  <EuiCheckbox
                    id="createWatch"
                    label="Create watch after datafeed has started"
                    checked={createWatch}
                    onChange={this.setCreateWatch}
                  />
                </div>
              }
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
StartDatafeedModal.propTypes = {
  setShowFunction: PropTypes.func.isRequired,
  unsetShowFunction: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};

function getLowestLatestTime(jobs) {
  const times = jobs.map(j => j.latestTimeStamp.unix.valueOf());
  return moment(Math.min(...times));
}
