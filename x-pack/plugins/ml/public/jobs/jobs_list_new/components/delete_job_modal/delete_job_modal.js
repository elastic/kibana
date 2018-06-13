/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiConfirmModal,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { deleteJobs } from '../utils';

export class DeleteJobModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobs: this.props.jobs,
      isModalVisible: false,
    };
    if (typeof this.props.showFunction === 'function') {
      this.props.showFunction(this.showModal);
    }

    this.refreshJobs = this.props.refreshJobs;
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = (jobs) => {
    this.setState({
      jobs,
      isModalVisible: true
    });
  }

  deleteJob = () => {
    this.closeModal();
    deleteJobs(this.state.jobs, this.refreshJobs);
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {
      const title = `Delete ${(this.state.jobs.length > 1) ? `${this.state.jobs.length} jobs` : this.state.jobs[0].id}`;

      modal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={title}
            onCancel={this.closeModal}
            onConfirm={this.deleteJob}
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>Are you sure you want to delete this job?</p>
          </EuiConfirmModal>
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
