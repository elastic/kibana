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

import { toastNotifications } from 'ui/notify';
import { mlJobService } from 'plugins/ml/services/job_service';

export class DeleteJobModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
    };
    if (typeof this.props.showFunction === 'function') {
      this.props.showFunction(this.showModal);
    }

    this.job = this.props.job;
    this.refreshJobs = this.props.refreshJobs;
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = (job) => {
    if (job !== undefined) {
      this.job = job;
    }
    this.setState({ isModalVisible: true });
  }

  deleteJob = () => {
    this.closeModal();
    deleteJob(this.job, this.refreshJobs);
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {
      const title = `Delete ${this.job.id}`;
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

function deleteJob(job, finish) {
  const status = { deleteLock: false, deleteDatafeed: 0, deleteJob: 0, errorMessage: '' };
  const tempJob = {
    job_id: job.id,
  };
  if (job.hasDatafeed) {
    tempJob.datafeed_config = {
      exists: true
    };
  }

  mlJobService.deleteJob(tempJob, status)
    .then(() => {
      toastNotifications.addSuccess(`${tempJob.job_id} successfully deleted`);
      finish();
    })
    .catch(() => {
      toastNotifications.addDanger(`${tempJob.job_id} could not be deleted`);
    });
}
